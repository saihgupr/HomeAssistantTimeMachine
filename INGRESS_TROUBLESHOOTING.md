# Ingress Mode Troubleshooting Guide

## Changes Made

The application has been updated to automatically enable ingress mode when running as a Home Assistant Add-on. Here's what was changed:

### 1. Automatic Add-on Mode Detection
- The app now detects if it's running as a Home Assistant add-on by checking for `/data/options.json` or the presence of Supervisor tokens
- When in add-on mode, ingress is automatically enabled (even without `INGRESS_ENTRY` env var)

### 2. Enhanced Logging
- Added comprehensive logging for ingress requests and headers
- All requests in add-on mode will log ingress-related information
- Server startup now shows clear ingress status

### 3. Debug Endpoints
- Added `/ping` endpoint (returns simple "pong" text)
- Added `/api/ping` endpoint (returns JSON with status and ingress info)
- These can help verify the server is responding

### 4. Error Handling
- Added server error handlers to catch port conflicts and startup issues
- Added process-level error handlers for uncaught exceptions

## Current Issue: 503 Service Unavailable

You're seeing a 503 error at: `https://ha.s1m0n.app/451bbd22_homeassistant-time-machine/ingress`

This error means Home Assistant Supervisor **cannot connect to the add-on** on port 54000.

## Troubleshooting Steps

### Step 1: Check Add-on Logs

In Home Assistant:
1. Go to Settings → Add-ons
2. Click on "Home Assistant Time Machine"
3. Click on the "Log" tab
4. Look for:
   ```
   [INIT] Running in add-on mode: true
   [INIT] Ingress enabled: true
   Server running at http://0.0.0.0:54000
   Ingress mode: ENABLED
   Running as Home Assistant Add-on
   ```

**If you DON'T see these logs:** The add-on isn't starting properly. Look for error messages.

**If you DO see these logs:** The add-on is starting, but the Supervisor can't reach it.

### Step 2: Check Supervisor Logs

1. Go to Settings → System → Logs
2. Select "Supervisor" from the dropdown
3. Look for errors like:
   ```
   Ingress error: Cannot connect to host 172.30.X.X:54000
   ```

### Step 3: Verify the Add-on is Accessible Internally

From the add-on's log tab, you should see requests coming in. Look for lines like:
```
[ingress-request] GET /
[ingress-request] Headers: { 'x-ingress-path': ..., 'x-forwarded-prefix': ... }
```

**If you DON'T see any requests:** The Supervisor isn't even trying to connect (likely a config issue).

**If you DO see requests but still get 503:** There's a routing or response issue.

### Step 4: Test the Ping Endpoint

Try accessing these URLs directly (if your add-on has external port access):
- `http://homeassistant.local:54000/ping` (should return "pong")
- `http://homeassistant.local:54000/api/ping` (should return JSON)

If these work but ingress doesn't, it's an ingress-specific issue.

## Common Causes of 503 Errors

### 1. Add-on Not Fully Started
- The add-on might still be initializing when Supervisor tries to connect
- **Solution:** Wait 30-60 seconds after restart, then try again

### 2. Port Not Actually Listening
- The app thinks it's listening but isn't
- **Check:** Look for "Server running at http://0.0.0.0:54000" in logs
- **Solution:** Restart the add-on

### 3. Network Policy Issues
- Home Assistant's internal network might be blocking connections
- **Solution:** Check if you have any custom network configurations or firewall rules

### 4. Resource Constraints
- The add-on might be crashing due to memory/CPU limits
- **Check:** Look for OOM (Out of Memory) errors in logs
- **Solution:** Increase resource limits in add-on configuration

### 5. Configuration File Issues
- The `config.yaml` might have incompatible settings
- **Current config:**
  - `ingress: true` ✓
  - `ingress_port: 54000` ✓
  - `ports: 54000/tcp: null` ✓ (correct for ingress-only)

### 6. Supervisor API Issues
- The Supervisor itself might have issues
- **Solution:** Try restarting the Supervisor:
  ```bash
  ha supervisor restart
  ```

## What to Check in Logs

### Good Log Output (Working):
```
[data-dir] Using persistent data directory: /data/homeassistant-time-machine
[INIT] Running in add-on mode: true
[INIT] INGRESS_ENTRY env var: (not set)
[INIT] Ingress enabled: true
[INIT] basePath will be: (empty - ingress mode)
[static] Static files configured for direct and ingress access
============================================================
Home Assistant Time Machine v2.9.268
============================================================
Server running at http://0.0.0.0:54000
Ingress mode: ENABLED
Running as Home Assistant Add-on
Environment: production
============================================================
[ingress-request] GET /
[ingress-request] Headers: { 'x-ingress-path': '...', ... }
```

### Bad Log Output (Problems):

**Missing add-on detection:**
```
[INIT] Running in add-on mode: false  ← PROBLEM!
[INIT] Ingress enabled: false  ← PROBLEM!
```

**Port binding errors:**
```
[server] Server error: Error: listen EADDRINUSE: address already in use
[server] Port 54000 is already in use
```

**Uncaught exceptions:**
```
[process] Uncaught exception: Error: ...
```

## Next Steps

1. **Restart the add-on** to apply the new changes
2. **Check the logs** immediately after restart
3. **Wait 30 seconds** for full initialization
4. **Try accessing the ingress URL** again
5. **Share the logs** if the issue persists - specifically:
   - The startup logs (from "[INIT]" through "Environment:")
   - Any error messages
   - Any "[ingress-request]" log lines (or lack thereof)

## Manual Testing

If you have SSH access to your Home Assistant system, you can test connectivity:

```bash
# Test if the port is listening
netstat -tuln | grep 54000

# Test direct connection (from within Home Assistant host)
curl http://172.30.33.X:54000/ping
# (Replace 172.30.33.X with the actual container IP)

# Check if the container is running
docker ps | grep homeassistant-time-machine
```

## References

- [Home Assistant Add-on Ingress Documentation](https://developers.home-assistant.io/docs/add-ons/presentation#ingress)
- [Home Assistant Add-on Configuration](https://developers.home-assistant.io/docs/add-ons/configuration)
- [Community Forum: Ingress Issues](https://community.home-assistant.io)

