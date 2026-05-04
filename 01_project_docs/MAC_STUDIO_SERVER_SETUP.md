# Mac Studio M2 Ultra — LiteLLM + Ollama Server Setup

**Hardware**: Apple Mac Studio M2 Ultra, 64 GB unified memory  
**Role**: Primary inference server — Ollama backend + LiteLLM proxy  
**Access**: Tailscale (anywhere) or SSH tunnel (LAN)  
**Default runner path**: `--llm litelm` → `LITELM_BASE_URL` → LiteLLM → Ollama

---

## Architecture

```
MacBook (runner)
    │
    │  HTTPS + API key (Tailscale)
    ▼
LiteLLM proxy  :4000   ←── litellm_config.yaml (model aliases)
    │
    │  localhost
    ▼
Ollama         :11434  ←── actual models (qwen3.6:35b-a3b, gemma4:31b-it …)
```

LiteLLM sits in front of Ollama and exposes an **OpenAI-compatible** `/v1/chat/completions` and `/v1/embeddings` API. The runner talks to LiteLLM — not Ollama directly — so model selection, routing, and auth are all handled at the proxy layer.

---

## Model Map

| LiteLLM alias | Ollama model | RAM (4-bit) | Role |
|---|---|---|---|
| `core-qwen` | `qwen3.6:35b-a3b` | ~22 GB | Default analysis (`--llm litelm`) |
| `core-gemma` | `gemma4:31b-it` | ~20 GB | Heavy / long docs (`--llm litelm-heavy`) |
| `review-qwen` | `qwen3.6:27b` | ~17 GB | Reasoning / ambiguous (`--llm litelm-reasoning`) |
| `review-gemma` | `gemma4:26b-a4b-it` | ~16 GB | Second-opinion enrichment |
| `triage` | `gemma4:e4b-it` | ~3 GB | Fast pre-screen (`--triage`) |
| `lexicon-llm` | `qwen3.6:35b-a3b` | ~22 GB | Stage 3c enrichment (same weights as core-qwen) |
| `coder` | `qwen3-coder:30b-a3b-instruct` | ~19 GB | Structured extraction |
| `research-embedding` | `qwen3-embedding:8b` | ~5 GB | Embeddings (all `--llm litelm*` paths) |

> The M2 Ultra's 64 GB is shared between all processes. Running two 22 GB models simultaneously is tight — `OLLAMA_KEEP_ALIVE=0` (set below) unloads each model after use, so only one is resident at a time. Embedding + a 22 GB chat model together (~27 GB total) is comfortable.

---

## Part 1 — Ollama on Mac Studio

### 1.1 Install Homebrew + Ollama

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install ollama
```

### 1.2 Configure Ollama (LaunchAgent)

Create a persistent service that binds only to localhost (LiteLLM is the public face):

```bash
mkdir -p ~/Library/LaunchAgents

cat > ~/Library/LaunchAgents/com.ollama.server.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.ollama.server</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/ollama</string>
        <string>serve</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>OLLAMA_HOST</key>
        <string>127.0.0.1:11434</string>
        <key>OLLAMA_KEEP_ALIVE</key>
        <string>0</string>
        <key>OLLAMA_NUM_PARALLEL</key>
        <string>1</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/ollama.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/ollama.err</string>
</dict>
</plist>
EOF

launchctl load ~/Library/LaunchAgents/com.ollama.server.plist
```

`OLLAMA_HOST=127.0.0.1` keeps Ollama localhost-only — LiteLLM handles external access.  
`OLLAMA_KEEP_ALIVE=0` unloads each model after the request — prevents OOM when switching models.

### 1.3 Pull Models

```bash
# Embedding (always needed)
ollama pull qwen3-embedding:8b

# Default analysis
ollama pull qwen3.6:35b-a3b

# Heavy / long docs
ollama pull gemma4:31b-it

# Reasoning / second opinion
ollama pull qwen3.6:27b

# Fast triage
ollama pull gemma4:e4b-it

# Enrichment (shares weights with core-qwen — no extra pull needed if core-qwen is installed)
# ollama pull qwen3.6:35b-a3b  ← already done above

# Optional: structured extraction
# ollama pull qwen3-coder:30b-a3b-instruct

# Verify
ollama list
```

> Pulls are large (5–22 GB each). Run over ethernet. They download once and cache permanently.

### 1.4 Verify Ollama

```bash
curl http://localhost:11434/api/tags
# Returns JSON listing installed models
```

---

## Part 2 — LiteLLM Proxy

LiteLLM is a lightweight Python proxy that translates OpenAI-format requests to Ollama (and other backends). Install it once, configure model aliases, and point the runner at it.

### 2.1 Install LiteLLM

```bash
# On the Mac Studio — needs Python 3.11+
pip3 install 'litellm[proxy]'

# Verify
litellm --version
```

If `pip3` installs to a path that's not in your shell's `PATH`, use:
```bash
python3 -m pip install 'litellm[proxy]'
python3 -m litellm --version
```

### 2.2 Create `litellm_config.yaml`

Save this file on the Mac Studio at `~/sogice/litellm_config.yaml` (or any stable path):

```bash
mkdir -p ~/sogice
```

```yaml
# ~/sogice/litellm_config.yaml
#
# CRITICAL: max_tokens must be set for every chat model.
# Without it, Ollama uses its default ~2048 token limit, which truncates
# structured JSON responses mid-object and causes Pydantic parse failures.

model_list:

  - model_name: core-qwen
    litellm_params:
      model: ollama_chat/qwen3.6:35b-a3b
      api_base: http://localhost:11434
      max_tokens: 8192

  - model_name: core-gemma
    litellm_params:
      model: ollama_chat/gemma4:31b-it
      api_base: http://localhost:11434
      max_tokens: 8192

  - model_name: review-qwen
    litellm_params:
      model: ollama_chat/qwen3.6:27b
      api_base: http://localhost:11434
      max_tokens: 8192

  - model_name: review-gemma
    litellm_params:
      model: ollama_chat/gemma4:26b-a4b-it
      api_base: http://localhost:11434
      max_tokens: 8192

  - model_name: triage
    litellm_params:
      model: ollama_chat/gemma4:e4b-it
      api_base: http://localhost:11434
      max_tokens: 4096

  - model_name: lexicon-llm
    litellm_params:
      model: ollama_chat/qwen3.6:35b-a3b
      api_base: http://localhost:11434
      max_tokens: 8192

  - model_name: coder
    litellm_params:
      model: ollama_chat/qwen3-coder:30b-a3b-instruct
      api_base: http://localhost:11434
      max_tokens: 8192

  - model_name: research-embedding
    litellm_params:
      model: ollama/qwen3-embedding:8b
      api_base: http://localhost:11434

litellm_settings:
  drop_params: true          # silently drop unsupported params (e.g. stream_options)
  request_timeout: 300       # 5 min — long docs can be slow on first model load

general_settings:
  master_key: sk-local-research-key-change-this   # must match LITELM_API_KEY in runner/.env
```

**Change the `master_key`** to something unique before first use. Write it down — it goes in `runner/.env` as `LITELM_API_KEY`.

### 2.3 Test LiteLLM Manually

```bash
# Start LiteLLM (foreground for testing)
# --host 0.0.0.0 is required — without it LiteLLM binds to localhost only and is
# unreachable over Tailscale (you'll see ConnectError in runner doctor)
litellm --config ~/sogice/litellm_config.yaml --port 4000 --host 0.0.0.0

# In a separate terminal — test chat completion
curl http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer sk-local-research-key-change-this" \
  -H "Content-Type: application/json" \
  -d '{"model": "triage", "messages": [{"role": "user", "content": "Say OK"}], "max_tokens": 10}'

# Test embedding
curl http://localhost:4000/v1/embeddings \
  -H "Authorization: Bearer sk-local-research-key-change-this" \
  -H "Content-Type: application/json" \
  -d '{"model": "research-embedding", "input": "test"}'
```

Both should return valid JSON. The first chat call will be slow (~15–30s) as Ollama loads the model.

### 2.4 Run LiteLLM as a Persistent Service (LaunchAgent)

```bash
# Find the full path to the litellm binary
which litellm
# Typical result: /usr/local/bin/litellm  or  /opt/homebrew/bin/litellm
```

Create the LaunchAgent (replace the `ProgramArguments` path if different):

```bash
cat > ~/Library/LaunchAgents/com.sogice.litelm.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.sogice.litelm</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/litellm</string>
        <string>--config</string>
        <string>/Users/YOUR_USERNAME/sogice/litellm_config.yaml</string>
        <string>--port</string>
        <string>4000</string>
        <string>--host</string>
        <string>0.0.0.0</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/litelm.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/litelm.err</string>
</dict>
</plist>
EOF

# Replace YOUR_USERNAME and load
sed -i '' "s/YOUR_USERNAME/$(whoami)/g" ~/Library/LaunchAgents/com.sogice.litelm.plist
launchctl load ~/Library/LaunchAgents/com.sogice.litelm.plist
```

Verify it started:
```bash
curl http://localhost:4000/health
# Should return {"status": "healthy", ...}
```

Check logs if something's wrong:
```bash
tail -f /tmp/litelm.log
tail -f /tmp/litelm.err
```

---

## Part 3 — Remote Access (Tailscale)

Tailscale creates an encrypted mesh network between your devices. Once both machines are on Tailscale, the MacBook can reach the Mac Studio at its Tailscale hostname regardless of network.

### 3.1 Install Tailscale on Both Machines

```bash
# On Mac Studio AND MacBook:
brew install --cask tailscale
```

Open the Tailscale app → sign in with the same account on both machines.

Find the Mac Studio's Tailscale hostname:
```bash
# On Mac Studio:
tailscale status
# Look for the machine name, e.g.: macstudio.tail12345.ts.net
```

### 3.2 Expose LiteLLM via Tailscale

LiteLLM defaults to binding on `127.0.0.1` (localhost only). The `--host 0.0.0.0` flag (set in the LaunchAgent above and in `general_settings` in the YAML) makes it listen on all interfaces, including the Tailscale interface. Without it you'll get `ConnectError` in `runner doctor` even though Tailscale is connected and the macOS firewall allows the process.

Tailscale handles NAT traversal and encryption — no extra config needed beyond the bind address.

Test from your MacBook:
```bash
curl https://macstudio.tail12345.ts.net:4000/health \
  -H "Authorization: Bearer sk-local-research-key-change-this"
```

> **HTTPS vs HTTP**: Tailscale traffic is already encrypted at the network layer, so `http://` is fine within a Tailscale network. If you want browser-accessible HTTPS (e.g. for the Streamlit dashboard), enable Tailscale HTTPS certificates: `tailscale cert macstudio.tail12345.ts.net` — but the runner works with plain `http://`.

### 3.3 Update `runner/.env` on MacBook

```env
# LiteLLM proxy on Mac Studio (Tailscale)
LITELM_BASE_URL=http://macstudio.tail12345.ts.net:4000
LITELM_API_KEY=sk-local-research-key-change-this

# Model aliases (must match litellm_config.yaml)
LITELM_ANALYSIS_MODEL=core-qwen
LITELM_ANALYSIS_MODEL_HEAVY=core-gemma
LITELM_ANALYSIS_MODEL_REASONING=review-qwen
LITELM_EMBEDDING_MODEL=research-embedding
LITELM_ENRICHMENT_MODEL=lexicon-llm
LITELM_ENRICHMENT_MODEL_ALT=core-gemma

# Raise truncation — Mac Studio handles full context
TRUNCATION_LIMIT_LOCAL=200000
```

---

## Part 4 — Verify Full Stack

Run these from your MacBook once Tailscale + LiteLLM + Ollama are all running:

```bash
cd runner

# 1. Pre-flight check (checks LiteLLM connectivity, credentials, Ollama)
python3 -m runner doctor

# 2. Verify embedding dimension (should report 4096d)
python3 -m runner embed-test

# 3. First ingest — default path through LiteLLM
python3 -m runner ingest https://example.org/document

# 4. Heavy model test (expect 2–5 min on first load)
python3 -m runner ingest document.pdf --llm litelm-heavy
```

---

## Part 5 — Maintenance

### Restart Services

```bash
# Restart Ollama
launchctl unload ~/Library/LaunchAgents/com.ollama.server.plist
launchctl load ~/Library/LaunchAgents/com.ollama.server.plist

# Restart LiteLLM
launchctl unload ~/Library/LaunchAgents/com.sogice.litelm.plist
launchctl load ~/Library/LaunchAgents/com.sogice.litelm.plist
```

### Update LiteLLM

```bash
pip3 install --upgrade 'litellm[proxy]'
# Then restart the LaunchAgent (see above)
```

### Update Ollama

```bash
brew upgrade ollama
launchctl unload ~/Library/LaunchAgents/com.ollama.server.plist
launchctl load ~/Library/LaunchAgents/com.ollama.server.plist
```

### Check RAM During Inference

```bash
# On Mac Studio — snapshot RAM usage
top -l 1 | grep -E "PhysMem|ollama"

# Or watch GPU + unified memory:
sudo powermetrics --samplers gpu_power -i 2000 -n 10
```

### View Logs

```bash
tail -f /tmp/ollama.log     # Ollama
tail -f /tmp/litelm.log     # LiteLLM requests
tail -f /tmp/litelm.err     # LiteLLM errors
```

---

## Part 6 — Fallback: SSH Tunnel (LAN Only, No LiteLLM)

If LiteLLM is not running and you need to use Ollama directly (e.g. `--llm local` from the MacBook via tunnel), you can forward the Ollama port directly. This bypasses LiteLLM and uses the local model flags instead of litelm aliases.

**Set up SSH key auth (once):**
```bash
# On MacBook:
ssh-keygen -t ed25519 -C "macbook-to-macstudio"
ssh-copy-id username@192.168.1.50   # Mac Studio LAN IP
```

**Add host alias (once):**
```bash
cat >> ~/.ssh/config << 'EOF'

Host macstudio
    HostName 192.168.1.50
    User YOUR_USERNAME
    IdentityFile ~/.ssh/id_ed25519
    ServerAliveInterval 60
    ServerAliveCountMax 10
EOF
```

**Open tunnel:**
```bash
ssh -N -L 11434:localhost:11434 macstudio
```

While the tunnel is open, `OLLAMA_BASE_URL=http://localhost:11434` routes to the Mac Studio. Use `--llm local-heavy` etc. — not `--llm litelm`.

> For the SSH tunnel approach, you'd also need to change Ollama's `OLLAMA_HOST` in the plist from `127.0.0.1` to `0.0.0.0` so it accepts tunnel connections. Edit the plist and reload.

---

## Expected Performance (M2 Ultra, 64 GB)

| Model | First load | Inference (avg doc ~9k chars) |
|---|---|---|
| `qwen3-embedding:8b` | ~5s | ~3s |
| `qwen3.6:35b-a3b` (core-qwen) | ~20s | ~60–120s |
| `gemma4:31b-it` (core-gemma) | ~18s | ~60–90s |
| `qwen3.6:27b` (review-qwen) | ~15s | ~45–90s |
| `gemma4:e4b-it` (triage) | ~5s | ~10–20s |

With `OLLAMA_KEEP_ALIVE=0`, load time is paid on every request. For batch runs, temporarily set `keep_alive: "10m"` in the LiteLLM config to keep the active model warm.

---

## Security Notes

- Tailscale encrypts all traffic — safe from anywhere
- LiteLLM's `master_key` is your auth layer — keep it out of git
- Ollama binds to `127.0.0.1` only — not directly accessible from the network
- Do not add port 4000 to any public firewall rules — Tailscale is the only intended path
