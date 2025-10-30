# Home Assistant Time Machine - Ingress Mode Changes

## Summary

Fixed the Home Assistant Time Machine add-on to **automatically enable ingress mode** when running as a Home Assistant add-on, eliminating the need for manual configuration.

## Files Modified

### 1. `/homeassistant-time-machine/app.js`

#### Changes:
- **Lines 54-62:** Added automatic add-on mode detection and ingress enablement
  - Detects add-on mode by checking for `/data/options.json` or Supervisor tokens
  - Sets `ingressEnabled = true` when in add-on mode
  - No longer requires `INGRESS_ENTRY` environment variable for ingress mode

- **Lines 89-92:** Enhanced startup logging
  - Logs add-on mode status
  - Logs ingress enabled status
  - Better visibility into configuration

- **Lines 109-149:** Improved ingress request middleware
  - Added comprehensive logging for all ingress requests in add-on mode
  - Logs all ingress-related headers for debugging
  - Better visibility into request routing

- **Lines 155-162:** Added health check endpoints
  - `/ping` - Simple text response for basic connectivity testing
  - `/api/ping` - JSON response with ingress status

- **Lines 1876-1878, 1891-1897, 1916-1921:** Updated health check and startup messages
  - Health API now returns `ingress: true` and `isAddonMode: true`
  - Startup banner shows "Ingress mode: ENABLED" and "Running as Home Assistant Add-on"

- **Lines 1910, 1975-1991:** Added error handling
  - Server error handlers for port conflicts
  - Process-level exception handlers
  - Better error reporting

### 2. `/homeassistant-time-machine/run.sh`

#### Changes:
- **Lines 7-16:** Updated version number and enhanced logging
  - Shows Supervisor token status
  - Shows all relevant environment variables
  - Added add-on mode detection message

- **Lines 18-22:** Added add-on mode detection at shell level
  - Checks for `/data/options.json` existence
  - Logs confirmation that ingress will be enabled

## Technical Details

### Add-on Mode Detection Logic

```javascript
const isAddonMode = fsSync.existsSync('/data/options.json') || 
                    (fsSync.existsSync('/data') && (process.env.SUPERVISOR_TOKEN || process.env.HASSIO_TOKEN));
```

The app is considered to be in add-on mode if:
1. `/data/options.json` exists (standard HA add-on), OR
2. `/data` directory exists AND a Supervisor token is present

### Ingress Enablement Logic

```javascript
const ingressEnabled = isAddonMode || !!process.env.INGRESS_ENTRY;
```

Ingress is considered enabled if:
1. Running in add-on mode (auto-detected), OR
2. `INGRESS_ENTRY` environment variable is explicitly set

### Ingress Path Handling

The app still respects the `INGRESS_ENTRY` environment variable when set by Home Assistant Supervisor for URL rewriting, but no longer requires it to enable ingress mode features.

## Expected Behavior After Changes

### When Running as Home Assistant Add-on:

**Startup Logs:**
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
```

**On Ingress Requests:**
```
[ingress-request] GET /
[ingress-request] Headers: {
  'x-ingress-path': '...',
  'x-forwarded-prefix': '...',
  'x-forwarded-for': '...',
  'x-real-ip': '...',
  'host': '...'
}
[ingress] Running in add-on mode but no ingress path header detected
```

### When Running in Docker Mode (Non-Add-on):

**Startup Logs:**
```
[data-dir] Using persistent data directory: /home/user/data
[INIT] Running in add-on mode: false
[INIT] INGRESS_ENTRY env var: (not set)
[INIT] Ingress enabled: false
[INIT] basePath will be: (empty - ingress mode)
[static] Static files configured for direct and ingress access
============================================================
Home Assistant Time Machine v2.9.268
============================================================
Server running at http://0.0.0.0:54000
Ingress mode: DISABLED
Environment: development
============================================================
```

## Testing

### Test Endpoints

1. **Basic Connectivity:**
   ```bash
   curl http://homeassistant.local:54000/ping
   # Expected: "pong"
   ```

2. **JSON Health Check:**
   ```bash
   curl http://homeassistant.local:54000/api/ping
   # Expected: {"status":"ok","timestamp":...,"ingress":true}
   ```

3. **Full Health Check:**
   ```bash
   curl http://homeassistant.local:54000/api/health
   # Expected: {"ok":true,"version":"2.9.268","mode":"addon","ingress":true,"isAddonMode":true,...}
   ```

### Verification Steps

1. **Restart the add-on** in Home Assistant
2. **Check the logs** for the expected startup messages
3. **Try accessing via ingress URL** (e.g., `https://ha.example.com/.../ingress`)
4. **Check logs for ingress request logs** when accessing

## Troubleshooting

If you're still experiencing issues after these changes, see `INGRESS_TROUBLESHOOTING.md` for detailed debugging steps.

## Backward Compatibility

These changes are **fully backward compatible**:
- Docker mode (non-add-on) continues to work as before
- Explicit `INGRESS_ENTRY` environment variable is still respected
- All existing functionality remains unchanged

## Next Steps if 503 Error Persists

1. Check add-on logs for startup messages
2. Check Supervisor logs for connection errors
3. Verify the add-on is actually starting (check logs immediately after restart)
4. Test direct connectivity to port 54000 if possible
5. Check for resource constraints (CPU/memory)
6. Try restarting the Home Assistant Supervisor

## Version

**Updated to:** v2.9.268
**Date:** 2025-10-30

