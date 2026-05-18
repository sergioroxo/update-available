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
5. [Error classification reference](#5-error-classification-reference)
6. [Safe restart steps (manual only)](#6-safe-restart-steps-manual-only)
7. [LiteLLM binding to 127.0.0.1 vs 0.0.0.0](#7-litelm-binding-to-127001-vs-0000)

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

## 5. Error classification reference

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

## 6. Safe restart steps (manual only)

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

## 7. LiteLLM binding to 127.0.0.1 vs 0.0.0.0

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
