# v2.3.0

- **Manual Deletion & Export:** You can now delete individual backups or export them as .tar.gz archives directly via the context menu. Deletion is blocked for locked backups to ensure data safety.
- **Context Menu:** Introduced a right-click context menu for backups to easily Lock, Unlock, Export, or Delete them.
- **Backup Lock:** Added a backup lock feature to prevent accidental deletion of backups. Protect your most important snapshots from being rotated out by auto-cleanup.
- **HACS Integration:** Introduced the Home Assistant companion integration, enabling native sensors and service calls.
- **Enhanced Sensors:** New sensor attributes for disk usage (total, free, used percentage), backup count, and version tracking.
- **Backup Status Tracking:** Real-time tracking of the last backup status (`success`, `failed`, `no_changes`) with persistence across restarts.
- **Service Improved:** `time_machine.backup_now` service call is now available with full parameter support for flexible automation.
- **Keyboard Navigation:** Navigate backups and items using arrow keys! Use Up/Down to change selection and Left/Right to switch between panels. Press Enter on an item to view its diff.
- **Docker Env Var:** Added `ESPHOME_CONFIG_PATH` environment variable support for Docker installations, allowing custom locations for ESPHome configuration files.
- **Split Config Support:** Advanced support for Home Assistant configurations using `!include`, `!include_dir_list`, and other split configuration methods.
- **Manifest-Driven Backups & Restoration:** Every backup now includes a detailed file manifest, ensuring that restores and change detection are perfectly aware of where your files live and are automatically placed back exactly where they belong in your YAML structure.

# v2.2.0

- **Smart Backup:** Incremental snapshots only save files that changed since your last backup. It looks complete in the UI but uses significantly less storage.
- **Show Changes Only:** Filter snapshots and files to just what has changed or deleted compared to your live config. This works per tab in both the snapshot list and file view.
- **Automation Triggers:** Backups can now be triggered from automations or scripts via `hassio.addon_stdin`. This is useful for scheduled, conditional, or event-driven backups.
- **Diff Color Palettes:** Eight new color palettes in the diff viewer which are switchable directly by clicking the header bar.

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