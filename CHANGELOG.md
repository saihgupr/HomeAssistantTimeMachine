# v2.5.0

### Added
- **Sign-In Page for Docker and Standalone:** The app now shows its own username and password form instead of the browser's HTTP Basic dialog. This works in the Home Assistant Companion app and other embedded webviews, where the native dialog never appears. Sessions last 30 days, and `/logout` signs out. The password is set with `HATM_PASSWORD`, or generated on first start and saved to `/data/api-password`. Changing it signs out existing sessions.
- **API Auth for the Container:** Standalone and Docker installs now ask for a password on `/api` routes. Set `HATM_USERNAME` to pick the username. The `/` page stays reachable so the sign-in page can load.
- **Add-On Auth Option:** Added `api_auth` (default `false`) and `api_auth_password` for add-on users who publish port 54000 directly. With `api_auth` off, Ingress and Home Assistant authentication still protect the panel.
- **Winter Mode:** A new toggle in Settings that makes snow fall across the app window. Off by default, and skipped when the system asks for reduced motion.
- **Settings Links:** The settings sheet now links to GitHub, Version Control, and Donate, with the links sitting below the Save and Cancel buttons.
- **Tests:** Path-safety unit tests plus an end-to-end test for auth, containment, and add-on mode.

### Fixed & Improved
- **Tab Switching:** Switching tabs clears the right panel and shows "Select a backup to view ..." instead of leaving the previous tab's files on screen.
- **Time Formats:** Backup timestamps follow the selected language's time format, so French and other 24-hour locales no longer show AM/PM.
- **No Browser Password Dialog:** The native password dialog no longer interrupts the app before it can show the sign-in page.
- **Loopback by Default:** Bare-metal runs bind to `127.0.0.1`. The Docker image still listens on all interfaces.
- **Maintenance:** Updated server dependencies (Express 4.22.3, `undici` replacing `node-fetch`) to clear all npm audit advisories.

### Security Hardening
- **Exact-Match CORS Allowlist:** `HATM_ALLOWED_ORIGINS` takes a comma-separated list of exact origins. No CORS headers are sent when the list is empty, cross-site writes are rejected, and Ingress headers are trusted only when they come from the Supervisor.
- **Contained File Operations:** Delete, lock, export, scan, and every restore now resolve paths against the configured config and backup folders, so an operation cannot reach outside them.
- **Scope:** The add-on behind Ingress was not exposed as long as port 54000 was not published. The standalone Docker deployment was the one that needed the password and the origin checks.

# v2.4.3

- **Fixed:** The integration manifest version now matches the add-on version, so HACS and Home Assistant report the same release.
- **Maintenance:** Updated GitHub Actions to their latest major versions.

# v2.4.2

- **Fixed:** Opening the integration options from the Home Assistant UI no longer crashes with a 500 error.
- **Fixed:** The Last Backup sensor now reads the add-on timestamp instead of reporting `unknown`, and still handles older add-on versions.
- **Fixed:** ESPHome and Packages tabs no longer hide snapshots whose manifest is missing file entries, and nested files are now compared through the backup chain.

# v2.4.1

- **Search All Backups:** Press Enter in search to find every snapshot containing an item across Automations, Scripts, Lovelace, ESPHome, and Packages. Results stream in as each backup is checked.
- **Performance Overhaul:** Parallel scanning and direct timestamp parsing cut load times for large backup sets (800+ snapshots) from ~10s to under 1s.
- **Split-Config Support:** Now handles labeled sections and one-automation-per-file setups. Every backup writes a manifest, so nothing goes missing.
- **Mobile Overhaul:** Full-screen edge-to-edge diff viewer, instant tap response on iOS, a cleaner header and footer, and the first 40 items render immediately.
- **Fixed:** Quoted `!include` targets now validate correctly, and relative mount names like `HA_TM_NAS` resolve to Supervisor paths (`/data/mounts/...`).
- **Fixed:** "Show Changes Only" now filters in the background, shows a checking status, and keeps snapshots visible if a check fails. Snapshots with no changes now say "No changes in this snapshot" instead of "No matching items".
- **Fixed:** Lovelace change detection now resolves files through the backup chain, so smart backups are not marked as changed just because unchanged files were skipped.

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
