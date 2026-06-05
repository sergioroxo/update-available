# Mac Studio / LiteLLM / Ollama — Troubleshooting

This document covers the most common failure modes when running the
SurvivingSOGICE ingestion runner against the Mac Studio M2 Ultra via
Tailscale.

**Quick diagnosis commands** (run these first):

```bash
python -m runner doctor          # pre-flight check — all services
python -m runner litelm-test     # deep test: chat + embedding via LiteLLM
python -m runner embed-test      # embedding dimension only
```

---

## Table of contents

1. [Checking whether LiteLLM is running](#1-checking-whether-litelm-is-running)
2. [Checking Ollama models on Mac Studio](#2-checking-ollama-models-on-mac-studio)
3. [What to do when Mac Studio is asleep or offline](#3-what-to-do-when-mac-studio-is-asleep-or-offline)
4. [PTY / process exhaustion](#4-pty--process-exhaustion)
5. [Supabase project paused](#5-supabase-project-paused)
6. [Error classification reference](#6-error-classification-reference)
7. [Safe restart steps (manual only)](#7-safe-restart-steps-manual-only)
8. [LiteLLM binding to 127.0.0.1 vs 0.0.0.0](#8-litelm-binding-to-127001-vs-0000)
9. [Enterprise network mode: Tailscale ping works but TCP times out](#9-enterprise-network-mode-tailscale-ping-works-but-tcp-times-out)
10. [What still works when Mac Studio TCP is blocked](#10-what-still-works-when-mac-studio-tcp-is-blocked)

---

## 1. Checking whether LiteLLM is running

### From your MacBook (via Tailscale)

```bash
# Replace with your Mac Studio Tailscale IP or hostname
curl http://<mac-studio>:4000/health

# Expected response when healthy:
# {"status": "healthy", ...}
```

If `curl` hangs or returns "Connection refused":

- Check Tailscale is connected on both machines (menu-bar icon)
- Check LiteLLM is running on Mac Studio (see below)

### On Mac Studio itself

```bash
# Check if LiteLLM process is running
ps aux | grep litellm

# Check which port it is bound to
lsof -i :4000 | grep LISTEN

# View the last LiteLLM log lines
# (adjust path if you used a different log location)
tail -50 ~/sogice/litellm.log
```

### Using the runner

```bash
python -m runner doctor            # shows "LiteLLM proxy ✓" or "✗ with hint"
python -m runner litelm-test       # sends actual chat + embedding requests
```

---

## 2. Checking Ollama models on Mac Studio

### From your MacBook (via Tailscale)

```bash
# List loaded models via the Ollama REST API
curl http://<mac-studio>:11434/api/tags | python3 -m json.tool

# Check which models are currently running (holding GPU memory)
curl http://<mac-studio>:11434/api/ps | python3 -m json.tool
```

### On Mac Studio itself

```bash
ollama list          # all pulled models
ollama ps            # models currently loaded (using memory)
ollama show qwen3.6:35b-a3b   # verify a specific model exists
```

### Expected models (from LiteLLM config)

| LiteLLM alias      | Ollama model            | Used for                 |
|--------------------|-------------------------|--------------------------|
| `core-qwen`        | `qwen3.6:35b-a3b`       | Default analysis         |
| `core-gemma`       | `gemma4:31b-it`         | Heavy / long documents   |
| `review-qwen`      | `qwen3.6:27b`           | Second opinion           |
| `triage`           | `gemma4:e4b-it`         | Fast pre-screen          |
| `research-embedding` | `qwen3-embedding:8b` | Embeddings (4096d)       |

If a model is missing, pull it on Mac Studio:

```bash
ollama pull qwen3-embedding:8b
ollama pull qwen3.6:35b-a3b
```

---

## 3. What to do when Mac Studio is asleep or offline

macOS Energy Saver can put the Mac Studio to sleep even with "Prevent
sleep" enabled, if a scheduled sleep or lid-close event occurs.

### Signs your Mac Studio is asleep

- `runner doctor` shows `NETWORK_UNREACHABLE` for LiteLLM proxy
- `ping <mac-studio-tailscale-ip>` times out or is unreachable
- Tailscale shows the device as "offline" in the admin console

### Wake options

1. **Physical**: press the power button or any key on a connected keyboard
2. **Network wake** (if configured):
   ```bash
   # Wake-on-LAN via Tailscale — requires prior configuration
   # https://tailscale.com/kb/1329/tailscale-wake-on-lan
   tailscale wake <mac-studio-name>
   ```
3. **Remote Desktop / Screen Sharing** (if on the same local network)

### Fallback while Mac Studio is offline

Use local models on your MacBook:

```bash
python -m runner ingest <url> --llm local           # qwen3.5:9b (fast, less accurate)
python -m runner ingest <url> --llm local-heavy     # gemma-4-26B (check RAM first — Q23)
python -m runner ingest <url> --llm claude          # Claude API (Tier 1 docs)
```

Check local Ollama is running: `ollama serve` (or confirm it is running with `ps aux | grep ollama`)

---

## 4. PTY / process exhaustion

### What is it?

macOS enforces a hard limit on the number of pseudo-terminal (PTY) devices
and on the total number of forked processes.  Ollama forks a subprocess
(the GGUF model runner) each time it loads or reloads a model.  If many
model loads happen in rapid succession — or if zombie processes accumulate
from previous crashes — the kernel can refuse to create new forks.

### Symptoms

- The terminal on Mac Studio shows:

  ```
  [forkpty: Resource temporarily unavailable]
  [Could not create a new process and open a pseudo-tty.]
  ```

- `runner litelm-test` returns:

  ```
  HTTP_500_PTY — macOS PTY / process-limit exhaustion on Mac Studio
  ```

- `runner doctor` shows HTTP 500 with a PTY hint

### Checking PTY usage

On Mac Studio:

```bash
# Count PTY slave devices currently allocated
ls /dev/ttys* | wc -l

# Check the system PTY hard limit
sysctl kern.tty.ptmx_max          # typical default: 127

# Count all running processes
ps ax | wc -l

# Look for zombie Ollama runner processes
ps aux | grep -E "(llama|ollama)" | grep -v grep
```

### Safe fix

**Do not kill processes without understanding what they are.**  The
recommended fix is a staged restart:

See [§ 6 — Safe restart steps](#6-safe-restart-steps-manual-only).

### Why does this happen?

- Ollama did not cleanly terminate previous model-runner processes after a
  crash or forced kill
- Many rapid sequential requests (e.g., batch ingest) caused Ollama to fork
  and unload models repeatedly
- A previous ingestion session was killed mid-inference, leaving zombie
  processes

### Prevention

- Use `--llm litelm-heavy` only for documents > 50 000 characters; default
  `--llm litelm` loads the lighter MoE model that is faster to unload
- Set `OLLAMA_MAX_LOADED_MODELS=1` in the Mac Studio environment if you
  see frequent model thrashing

---

## 5. Supabase project paused

### What happens

Supabase automatically pauses free-tier projects after **7 days of inactivity**.
When a project is paused, its hostname (e.g. `<project-ref>.supabase.co`) is
taken offline and DNS resolution fails entirely.

### Symptom

`runner doctor` shows:

```
✗  Supabase document_embeddings
   DNS resolution failed for Supabase hostname — project is likely paused.
   Free-tier projects pause after 7 days of inactivity.
```

The underlying OS error is `[Errno 8] nodename nor servname provided, or not
known` (macOS `EAI_NONAME`) — the hostname simply does not resolve because
Supabase has taken it offline.

### Fix

1. Go to **[app.supabase.com](https://app.supabase.com)**
2. Select the SurvivingSOGICE project
3. Click **"Restore project"** (shown as a banner when the project is paused)
4. Wait 1–2 minutes for the project to come back online
5. Re-run: `python -m runner doctor`

### Prevention

The project pauses only if no API calls reach it for 7 consecutive days.
Running `runner stats` or `runner verify` once a week is enough to keep it
active (both make a lightweight Supabase read).

Alternatively, upgrade to the Supabase Pro tier (paid) to disable
auto-pausing entirely.

---

## 6. Error classification reference

`runner litelm-test` classifies every failure precisely.  Here is the
full taxonomy with causes and remediation:

| Error kind           | Meaning                                          | Fix                                                              |
|----------------------|--------------------------------------------------|------------------------------------------------------------------|
| `NETWORK_UNREACHABLE` | Cannot TCP-connect to Mac Studio                | Mac Studio asleep, Tailscale down, or LiteLLM not started       |
| `AUTH_FAILURE`        | HTTP 401 / 403                                  | `LITELM_API_KEY` in `runner/.env` ≠ `master_key` in config.yaml |
| `HTTP_500_PTY`        | Ollama hit macOS PTY / process limit            | Restart Ollama (§ 6)                                             |
| `HTTP_500_UPSTREAM`   | Ollama model-runner error (not PTY related)     | Check `ollama ps`; pull missing model; restart Ollama            |
| `HTTP_500_LITELM`     | LiteLLM internal error (not Ollama)             | Restart LiteLLM (§ 6); check LiteLLM logs                       |
| `HTTP_500_UNKNOWN`    | HTTP 500 with no interpretable body             | Check Mac Studio logs; restart Ollama + LiteLLM                  |
| `JSON_PARSE`          | Response is not valid / expected JSON           | Possible partial output (max_tokens too low); check config.yaml  |
| `DIMENSION_MISMATCH`  | Embedding returned wrong vector length          | `LITELM_EMBEDDING_MODEL` not resolving to `qwen3-embedding:8b`  |

---

## 7. Safe restart steps (manual only)

> ⚠️ **These steps require SSH or physical access to Mac Studio.**
> Do not run them unless you understand which services are affected.
> They are listed here as reference — the runner will never execute
> any of these automatically.

### Restart Ollama only (least disruptive)

```bash
# On Mac Studio:
# 1. Stop Ollama gracefully
pkill -TERM ollama

# 2. Wait a few seconds, then verify it has stopped
sleep 3 && ps aux | grep ollama | grep -v grep

# 3. If zombie runner processes remain, list them first:
ps aux | grep -E "(llama_runner|ggml)" | grep -v grep

# 4. Restart Ollama (if running as a launchd service)
launchctl stop com.ollama.ollama
launchctl start com.ollama.ollama

# Or if running manually:
ollama serve &
```

### Restart LiteLLM only

```bash
# On Mac Studio:
# If running as a launchd service:
launchctl stop com.sogice.litelm
launchctl start com.sogice.litelm

# If running in a screen/tmux session:
# Attach to the session, Ctrl-C, then re-run:
litellm --config ~/sogice/litellm_config.yaml --port 4000 --host 0.0.0.0
```

### Restart both (Ollama + LiteLLM)

```bash
# On Mac Studio:
pkill -TERM litellm
pkill -TERM ollama
sleep 5

# Verify all processes are gone:
ps aux | grep -E "(litellm|ollama)" | grep -v grep

# Start Ollama first, then LiteLLM:
launchctl start com.ollama.ollama
sleep 3
launchctl start com.sogice.litelm

# Verify from MacBook:
python -m runner litelm-test
```

### Full Mac Studio restart (last resort)

Only needed if PTY count is near the kernel limit and `pkill` does not
free them (rare — requires physical access or remote SSH):

```bash
# macOS graceful restart via SSH:
sudo shutdown -r now
```

After restart, verify from MacBook:

```bash
python -m runner doctor
python -m runner litelm-test
```

---

## 8. LiteLLM binding to 127.0.0.1 vs 0.0.0.0

LiteLLM defaults to binding on `127.0.0.1`, which means it only accepts
connections from the Mac Studio itself.  Tailscale traffic arrives on the
Tailscale network interface (a different IP), so it will be refused.

### Symptom

`runner doctor` shows `NETWORK_UNREACHABLE` with `ConnectError` even
though you can `ping` the Mac Studio.

### Fix

Start LiteLLM with `--host 0.0.0.0`:

```bash
litellm --config ~/sogice/litellm_config.yaml --port 4000 --host 0.0.0.0
```

Or add it to the launchd plist `ProgramArguments` array:

```xml
<key>ProgramArguments</key>
<array>
    <string>/path/to/litellm</string>
    <string>--config</string>
    <string>/Users/yourname/sogice/litellm_config.yaml</string>
    <string>--port</string>
    <string>4000</string>
    <string>--host</string>
    <string>0.0.0.0</string>
</array>
```

Then reload the plist:

```bash
launchctl unload ~/Library/LaunchAgents/com.sogice.litelm.plist
launchctl load  ~/Library/LaunchAgents/com.sogice.litelm.plist
```

Verify from MacBook after reloading:

```bash
curl http://<mac-studio-tailscale-ip>:4000/health
python -m runner litelm-test
```

---

## 9. Enterprise network mode: Tailscale ping works but TCP times out

This is a distinct failure mode observed on the work/enterprise network.
Do not keep changing runner code, model aliases, API keys, or prompts when this
happens.

### Symptom

On the MacBook, Tailscale peer routing works:

```bash
tailscale ping mqvlfwcwmc
# pong from mqvlfwcwmc (100.107.255.70) ...
```

But every TCP request to the Mac Studio times out:

```bash
curl -i --connect-timeout 8 http://100.107.255.70:4000/v1/models
curl -i --connect-timeout 8 http://100.107.255.70:11555/health
curl -i https://mqvlfwcwmc.tail379051.ts.net/v1/models
curl -i https://mqvlfwcwmc.tail379051.ts.net:11555/health
```

Typical result:

```text
curl: (28) Failed to connect ... Timeout was reached
```

At the same time, the Mac Studio itself reports the services are healthy:

```bash
curl -i http://127.0.0.1:4000/v1/models
# 401 Unauthorized is OK here if no API key is provided; it proves LiteLLM answered.

curl -i http://127.0.0.1:11555/health \
  -H "Authorization: Bearer <MODEL_CONTROL_TOKEN>"
# {"ok": true}
```

And the LaunchAgents are running:

```bash
launchctl print gui/$(id -u)/com.sogice.litelm | head -40
launchctl print gui/$(id -u)/org.sogice.model-control | head -40
```

### Meaning

The ingestion system is not broken. LiteLLM and model-control are not broken.
The MacBook can see the Mac Studio as a Tailscale peer, but TCP traffic to the
Mac Studio is not usable from the MacBook. This can be caused by enterprise
network filtering, local firewall / network extension policy, Tailscale Serve
limitations on that network, or device-management rules.

### What not to do

- Do not keep changing `LITELM_BASE_URL` between ports hoping one will work.
- Do not delete unrelated Tailscale Serve handlers unless you know what they
  expose.
- Do not disturb RustDesk or other remote-management tools. RustDesk is a
  separate safety channel and should remain available.
- Do not conclude that Sanity, Supabase, prompts, enrichment, or the Streamlit
  app are broken solely from this failure.

### Current safe interpretation

Use this table:

| Check | Meaning |
|---|---|
| Mac Studio `curl 127.0.0.1:4000` works | LiteLLM service is alive |
| Mac Studio `curl 127.0.0.1:11555/health` works | model-control service is alive |
| MacBook `tailscale ping mqvlfwcwmc` works | Tailscale identity/routing exists |
| MacBook `curl 100.107.255.70:4000` times out | MacBook -> Mac Studio TCP is blocked/unusable |
| MacBook `curl tailnet HTTPS` times out | Tailscale Serve path is also blocked/unusable |

When the last two rows are true, do not run MacBook-side `--llm litelm` batch
jobs. They will hang or fail at the network layer.

### Recovery options

Pick one. Do not combine all at once.

1. Move to a network where MacBook -> Mac Studio TCP works, then retest direct IP:

   ```bash
   curl -i --connect-timeout 8 http://100.107.255.70:4000/v1/models \
     -H "Authorization: Bearer <LITELM_API_KEY>"
   ```

2. Run the ingestion app and batch runner on the Mac Studio itself, against the
   local services. This avoids MacBook -> Mac Studio TCP entirely, but requires
   a deliberate corpus/repo sync strategy.

3. Use MacBook-local fallback models for small attended work:

   ```bash
   python -m runner ingest <url> --llm local
   python -m runner reanalyze <doc_id> --llm local
   ```

4. Use Claude/API paths for selected high-priority documents if configured and
   methodologically acceptable.

### Tailscale Serve note

Tailscale Serve can show valid routes such as:

```text
https://mqvlfwcwmc.tail379051.ts.net
|-- / proxy http://127.0.0.1:4000

https://mqvlfwcwmc.tail379051.ts.net:11555
|-- / proxy http://127.0.0.1:11555
```

This proves the Mac Studio has a Serve configuration. It does not prove the
MacBook can open TCP connections to those served ports from the current network.
Always confirm from the MacBook with `curl`.

---

## 10. What still works when Mac Studio TCP is blocked

The runner is staged. A Mac Studio network outage does not mean every workflow
must stop.

### Safe to do

- Add URLs to the Source Queue.
- Edit researcher notes, review local JSON, approve/reject proposals, and update
  provenance/readiness fields in the Streamlit app.
- Use local Ollama paths if `Local Ollama reachable` is green.
- Push already-reviewed local records to Sanity/Supabase if those services are
  reachable and the document does not require a fresh LiteLLM analysis/enrichment
  run.
- Run tests and documentation updates.

### Do not do until LiteLLM is green

- MacBook-side `--llm litelm`, `litelm-heavy`, or `litelm-reasoning` analysis.
- Batch ingestion that includes Stage 3b/3c via LiteLLM.
- Complement enrichment through the Mac Studio models.
- Overnight unattended batches.

### Practical operating rule

Doctor should distinguish these layers:

- `Local Ollama reachable` green means MacBook-local fallback is available.
- `LiteLLM reachable` red means Mac Studio inference from the MacBook is not
  available.
- `Mac Studio model-control reachable` red means automatic model unloads from
  the MacBook are not available.

If local work is enough, continue locally. If the pilot requires Mac Studio
quality/speed, either fix the network path first or run the workflow on the
Mac Studio itself.
