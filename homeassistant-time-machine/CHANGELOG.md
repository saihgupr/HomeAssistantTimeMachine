# v2.4

- **Docker Env Var:** Added `ESPHOME_CONFIG_PATH` environment variable support for Docker installations, allowing custom locations for ESPHome configuration files.

# v2.3

- **Split Config Support:** Advanced support for Home Assistant configurations using `!include`, `!include_dir_list`, and other split configuration methods.
- **Manifest-Driven Backups:** Every backup now includes a detailed file manifest, ensuring that restores and change detection are perfectly aware of where your files live.
- **Improved Restoration:** Restore operations now automatically use the backup manifest to track and place files back exactly where they belong in your YAML structure.

# v2.2

- **Smart Backup:** New incremental backup mode that only saves files that have changed since the last snapshot. This significantly reduces storage usage while ensuring every snapshot appears complete and browsable in the UI.
- **Show Changes Only:** New toggle in settings to filter the snapshot list, showing only backups that contain changed or deleted items compared to your current live configuration. Works per-tab and filters both the snapshot list and items list.
- **Automation Service Call:** Trigger backups from Home Assistant automations or scripts using the `hassio.addon_stdin` service. Perfect for custom backup schedules or event-driven backups.
- **Diff Palettes:** Cycle through 8 new vibrant color palettes for the diff viewer by clicking the diff header bar.

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