# v2.3.1

- **Integration Updates:** You can now configure the integration directly from the Home Assistant UI, and the `time_machine.backup_now` service call now supports all available parameters for granular control.
- **Fixed Scope Bug:** Fixed a `ReferenceError: findFullRange is not defined` bug that occurred when restoring an individual automation or script.

# v2.3.0

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
