# v2.5

- **Keyboard Navigation:** Navigate backups and items using arrow keys! Use Up/Down to change selection and Left/Right to switch between panels. Press Enter on an item to view its diff.

# v2.4

- **Docker Env Var:** Added `ESPHOME_CONFIG_PATH` environment variable support for Docker installations, allowing custom locations for ESPHome configuration files.

# v2.3

- **Split Config Support:** Advanced support for Home Assistant configurations using `!include`, `!include_dir_list`, and other split configuration methods.
- **Manifest-Driven Backups:** Every backup now includes a detailed file manifest, ensuring that restores and change detection are perfectly aware of where your files live.
- **Improved Restoration:** Restore operations now automatically use the backup manifest to track and place files back exactly where they belong in your YAML structure.

# v2.2.0

- **Integration Renaming:** Unified integration domain to `time_machine` for a cleaner experience.
- **Enhanced Sensors:** New sensor attributes for disk usage (total, free, used percentage) and backup count.
- **Backup Status Tracking:** Real-time tracking of the last backup status (`success`, `failed`, `no_changes`) with persistence across restarts.
- **Service Improved:** `time_machine.backup_now` service call is now more robust and reliable.
- **Performance:** Reduced default scan interval to 30 seconds for more responsive status updates.

# v2.1

- **Restore Logic:** Restoring automations and scripts now preserves their original position instead of moving them to the bottom.
- **Performance:** Significant optimizations for faster load times and smoother operation.

# v2.0.2

- Minor tweaks and bug fixes.

# v2.0

## What's New!
- Added full **Ingress support**, allowing direct access through the Home Assistant UI — no port forwarding required.  
- Introduced **Lovelace dashboard backup and restore**, now included automatically in all backups.  
- Added configurable **ESPHome** and **Packages** backup support — enable these in the add-on configuration.  
- Implemented a **Backup Now** button in the UI for instant manual backups.  
- Added **Max Backups** retention setting to manage storage limits.  
- Integrated **proper authentication** using Home Assistant tokens, automatically proxied through the Supervisor.  
- Added **Docker container option** for running standalone outside the add-on store.  
- Optimized image to be **4× smaller and faster**, significantly reducing size and memory usage.  
- Introduced **Dark and Light mode themes** for the web UI.  
- Enabled **flexible backup locations**, supporting `/share`, `/backup`, `/config`, `/media`, and remote mounts.  
- Exposed a **full REST API** for automation of backups and restores.

## Updating
If you’re updating from **v1**, note that this release is a **complete rebuild**.  

After updating:
1. **Restart the add-on.**  
2. **Re-enter your backup path** in the settings menu.  
3. **Reconfigure your schedule** in the settings menu.  

Some users reported seeing **“Error 503: Service Unavailable”** right after updating to v2.  
- In most cases, a **restart** of the add-on fixes it.  
- If it persists, click **Rebuild**