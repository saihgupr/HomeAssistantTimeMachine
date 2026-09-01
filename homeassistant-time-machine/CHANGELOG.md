# v2.4.0

- **Fixed:** Resolved UI sidebar duplication and blank diff display issue when comparing split configuration automations and scripts without explicit IDs or with identical aliases.
- **Fixed:** Automatically resolve relative backup mount names (e.g. `HA_TM_NAS`) to Supervisor network mount paths (`/data/mounts/...`).
- **Performance:** Parallelized backup directory scanning using `Promise.all`, cutting initial load time from ~10s to under 1s for large backup sets (800+ snapshots on external storage).
- **Performance:** Timestamps are now parsed directly from folder names for the common date-based naming format, eliminating per-folder `fs.stat` calls entirely.
- **Performance:** Mode-based manifest filtering (`automations`, `scripts`, `lovelace`, etc.) now runs in parallel across all backups instead of sequentially.
- **Mobile:** Backup list renders the first 40 items immediately on load — the list is interactive before the full set finishes streaming in the background.
- **Mobile:** Diff viewer is now a full-screen frame on mobile (edge-to-edge, no bottom sheet), maximising usable space on small screens.
- **Mobile:** Removed the redundant `×` close button from the diff viewer header; Cancel and Restore buttons in the footer handle dismissal.
- **Mobile:** The top title/logo header is now hidden on mobile — Home Assistant Ingress already provides its own app header.
- **Mobile:** "Restore This Version" button label shortened to "Restore" on narrow screens to avoid overflow.
- **Mobile:** Fixed search bar icon overlapping placeholder text on mobile by increasing left padding.
- **Mobile:** Fixed iOS WebKit tap-registration delay — backup list items are now selectable on first tap without waiting for the full list to load.


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
