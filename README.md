# Home Assistant Time Machine

Home Assistant Time Machine is a web-based tool that acts as a "Time Machine" for your Home Assistant configuration. Browse YAML backups across automations, scripts, Lovelace dashboards, ESPHome files, and packages, then restore individual items back to your live setup with confidence.

## What's New!

*   **Smart Backup:** New incremental backup mode that only saves files that have changed since the last snapshot. This significantly reduces storage usage while ensuring every snapshot appears complete and browsable in the UI.
*   **Show Changes Only:** New toggle in settings to filter the snapshot list, showing only backups that contain changed or deleted items compared to your current live configuration. Works per-tab and filters both the snapshot list and items list.
*   **Automation Service Call:** Trigger backups from Home Assistant automations or scripts using the `hassio.addon_stdin` service. Perfect for custom backup schedules or event-driven backups.
*   **Diff Palettes:** Cycle through 8 new vibrant color palettes for the diff viewer by clicking the diff header bar.

![Screenshot 1](https://raw.githubusercontent.com/DiggingForDinos/HomeAssistantTimeMachine/main/images/1.png)
![Screenshot 2](https://raw.githubusercontent.com/DiggingForDinos/HomeAssistantTimeMachine/main/images/2.png)
![Screenshot 3](https://raw.githubusercontent.com/DiggingForDinos/HomeAssistantTimeMachine/main/images/3.png)
![Screenshot 4](https://raw.githubusercontent.com/DiggingForDinos/HomeAssistantTimeMachine/main/images/4.png)
![Screenshot 5](https://raw.githubusercontent.com/DiggingForDinos/HomeAssistantTimeMachine/main/images/5.png)
![Screenshot 5](https://raw.githubusercontent.com/DiggingForDinos/HomeAssistantTimeMachine/main/images/6.png)

## Features

*   **Browse Backups:** Easily browse through your Home Assistant backup YAML files.
*   **View Changes:** See a side-by-side diff of the changes between a backed-up item and the live version.
*   **Restore Individual Items:** Restore individual automations or scripts without having to restore an entire backup.
*   **Safety First:** Automatically creates a backup before restoring anything.
*   **Reload Home Assistant:** Reload automations or scripts directly from the UI after a restore.
*   **Scheduled Backups:** Configure automatic backups on a schedule.
*   **Service Call Support:** Trigger backups from automations or scripts using the `hassio.addon_stdin` service.
*   **Multi-language Support:** Available in English, Spanish, German, French, Dutch, and Italian.
*   **Ingress Support:** Access through the Home Assistant UI without port forwarding.
*   **Lovelace Backup:** Backup and restore your Lovelace dashboard configurations.
*   **ESPHome & Packages Backup:** Optionally backup ESPHome and Packages files.
*   **Backup Now Button:** Trigger an immediate backup with a single click.
*   **Max Backups:** Set a limit on how many backups are kept.
*   **Flexible Backup Locations:** Store backups in `/share`, `/backup`, `/config`, `/media`, or remote shares.
*   **REST API:** Full API for programmatic backup management.

## Installation

There are two ways to install Home Assistant Time Machine: as a Home Assistant add-on or as a standalone Docker container.

### 1. Home Assistant add-on (Recommended for most users)

1.  **Add Repository:**
    Click the button below to add the repository to your Home Assistant instance:

    [![Open your Home Assistant instance and show the add-on store](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https://github.com/DiggingForDinos/ha-addons)

    **Or manually add it:**
    - Navigate to **Settings** → **Add-ons** → **Add-on Store**
    - Click the three dots (⋮) in the top right corner and select **Repositories**
    - Add the repository URL:
      ```
      https://github.com/DiggingForDinos/ha-addons
      ```

2.  **Install the Add-on:**
    The "Home Assistant Time Machine" add-on will now appear in the store. Click on it and then click "Install".

### 2. Standalone Docker Installation

For Docker users who aren't using the Home Assistant add-on, you have three deployment options:

**Option A: Docker Compose (recommended):**

1. Download the compose.yaml file:
   ```bash
   curl -o compose.yaml https://raw.githubusercontent.com/DiggingForDinos/HomeAssistantTimeMachine/main/compose.yaml
   ```

2. Edit the file to set your paths and credentials:
   ```bash
   nano compose.yaml
   ```

3. Start the service:
   ```bash
   docker compose up -d
   ```

**Option B: Docker Run (pre-built image):**

```bash
docker run -d \
  -p 54000:54000 \
  -e HOME_ASSISTANT_URL="http://your-ha-instance:8123" \
  -e LONG_LIVED_ACCESS_TOKEN="your-long-lived-access-token" \
  -v /path/to/your/ha/config:/config \
  -v /path/to/your/backups:/media \
  -v ha-time-machine-data:/data \
  --name ha-time-machine \
  ghcr.io/diggingfordinos/homeassistanttimemachine:latest
```

**Option C: Build locally:**

```bash
git clone https://github.com/DiggingForDinos/HomeAssistantTimeMachine.git
cd HomeAssistantTimeMachine/homeassistant-time-machine
docker build -t ha-time-machine .

docker run -d \
  -p 54000:54000 \
  -e HOME_ASSISTANT_URL="http://your-ha-instance:8123" \
  -e LONG_LIVED_ACCESS_TOKEN="your-long-lived-access-token" \
  -v /path/to/your/ha/config:/config \
  -v /path/to/your/backups:/media \
  -v ha-time-machine-data:/data \
  --name ha-time-machine \
  ha-time-machine
```

Supplying the URL and token keeps credentials out of the UI. These environment variables are optional—if you set them, the settings fields are read-only; if you omit them, you can enter credentials in the web UI instead.

**Alternative:** omit the environment variables, start the container with the same volumes, then visit `http://localhost:54000` to enter credentials in the settings modal. They are stored in `/data/docker-ha-credentials.json`.

#### Changing Options in Docker

After the container is running, you can toggle ESPHome support, adjust text style, and switch light/dark modes by POSTing to the app settings API. This persists the value in `/data/homeassistant-time-machine/docker-app-settings.json` so the UI reflects it on reload:

```bash
curl -X POST http://localhost:54000/api/app-settings \
  -H 'Content-Type: application/json' \
  -d '{
        "theme": "light",
        "esphomeEnabled": true,
        "packagesEnabled": true,
        "language": "de"
      }'
```

Adjust the payload if you need different paths, theme, or want to enable/disable features (`"esphomeEnabled": true|false`, `"packagesEnabled": true|false`, `"theme": light|dark`, `"language": en|es|de|fr|nl|it`).

#### Accessing the Web Interface

After starting the container, access the web interface at `http://localhost:54000` (or your server's IP/port).

**Note:** The HA URL and token fields in settings will be read-only if configured via environment variables, or editable if configured through the web UI.

## Usage

> **Tip:** If you expose port `54000/tcp` (for example, via the add-on's Configuration tab), you can open the UI directly at `http://your-host:54000` without relying on ingress.

### Home Assistant add-on

1.  **Configure the add-on:** In the add-on's configuration tab, set theme, language, esphome/packages toggle, and port.
2.  **Start the add-on.**
3.  **Open the Web UI:**
    *   Use **Open Web UI** from the add-on panel to launch ingress (default recommended when the external port is disabled).
    *   Or, if you've enabled port `54000/tcp` in the add-on configuration, browse to `http://homeassistant.local:54000` (or your configured host/port).
4.  **In-app setup:**
    *   In the web UI, go to the settings menu.
    *   **Live Home Assistant Folder Path:** Set the path to your Home Assistant configuration directory (e.g., `/config`).
    *   **Backup Folder Path:** Set the path to the directory where your backups are stored (e.g., `/media/timemachine`).

### Docker Container

1.  **Start the container** with the required volume mounts (see Docker installation above).
2.  **Open the Web UI** at `http://localhost:54000` (or your server's IP/port).
3.  **In-app setup:**
    *   In the web UI, go to the settings menu.
    *   **Live Home Assistant Folder Path:** Set to `/config` (this is the mounted volume).
    *   **Backup Folder Path:** Set to `/media/timemachine` (this is the mounted volume).

### Triggering Backups from Automations

You can trigger a backup from Home Assistant automations or scripts using the `hassio.addon_stdin` service:

```yaml
service: hassio.addon_stdin
data:
  addon: 0f6ec05b_homeassistant-time-machine
  input: backup
```

> **Note:** Replace `0f6ec05b_homeassistant-time-machine` with your addon's slug if different.

## Backup to Remote Share

To configure backups to a remote share, first set up network storage within Home Assistant (Settings > System > Storage > 'Add network storage'). Name the share 'backups' and set its usage to 'Media'. Once configured, you can then specify the backup path in Home Assistant Time Machine settings as '/media/backups', which will direct backups to your remote share.

## API Endpoints

- **POST /api/backup-now**: Trigger an immediate backup. Requires `liveFolderPath` and `backupFolderPath`. Optional parameters (`smartBackupEnabled`, `maxBackupsEnabled`, `maxBackupsCount`, `timezone`) fall back to saved settings when not provided.
- **POST /api/restore-automation** / **POST /api/restore-script**: Restore a single automation or script after creating a safety backup.
- **POST /api/restore-lovelace-file** / **POST /api/restore-esphome-file** / **POST /api/restore-packages-file**: Restore Lovelace, ESPHome, or package files with automatic pre-restore backups.
- **POST /api/get-backup-* ** & **/api/get-live-* ** families: Fetch specific items from backups or the live config (automations, scripts, Lovelace, ESPHome, packages).
- **GET /api/schedule-backup** / **POST /api/schedule-backup**: Inspect or update scheduled backup jobs.
- **POST /api/scan-backups**: Scan the backup directory tree and list discovered backups.
- **POST /api/validate-path** / **POST /api/validate-backup-path**: Verify that provided directories exist and contain Home Assistant data/backups.
- **POST /api/test-home-assistant-connection**: Confirm stored Home Assistant credentials work before saving.
- **POST /api/reload-home-assistant**: Invoke a Home Assistant reload service (e.g., `automation.reload`).
- **GET /api/health**: Simple status endpoint exposing version, ingress state, and timestamp.

Example usage:
```bash
# Trigger backup
curl -X POST http://localhost:54000/api/backup-now \
  -H "Content-Type: application/json" \
  -d '{"liveFolderPath": "/config", "backupFolderPath": "/media/timemachine"}'

# Get scheduled jobs
curl http://localhost:54000/api/schedule-backup

# Scan backups
curl -X POST http://localhost:54000/api/scan-backups \
  -H "Content-Type: application/json" \
  -d '{"backupRootPath": "/media/timemachine"}'
```

## Alternative Options

For detailed history tracking powered by a local Git backend, check out [Home Assistant Version Control](https://github.com/DiggingForDinos/HomeAssistantVersionControl/). It provides complete version history for your setup by automatically tracking every change to your YAML files.

## Identity Verification (Migration from saihgupr)

To prove that I am the same original creator, I have added cryptographic proof to this repository:
*   **[proof_of_identity.txt](proof_of_identity.txt):** A statement linked to the old identity.
*   **[proof_of_identity.txt.sig](proof_of_identity.txt.sig):** A digital signature created using `saihgupr`'s original private SSH key.
*   **Signed Tags:** New releases (starting with [identity-proof-v1](https://github.com/DiggingForDinos/HomeAssistantTimeMachine/releases/tag/identity-proof-v1)) are GPG-signed by the new `DiggingForDinos` identity.

You can verify the SSH proof manually:
```bash
ssh-keygen -Y check-novalidate -n file -f old_identity.pub -s proof_of_identity.txt.sig < proof_of_identity.txt
```

## Press & Community

Thank you to everyone who has written about or featured Home Assistant Time Machine!

- [XDA Developers – "Home Assistant Time Machine tool is amazing"](https://www.xda-developers.com/home-assistant-time-machine-tool-is-amazing/)
- [Glooob Domo – YouTube Video](https://www.youtube.com/watch?v=aWZ0ON8b8io)
- [smarterkram | Olli – YouTube Video](https://www.youtube.com/watch?v=zyTExP_ebAE)

## Support, Feedback & Contributing

- File issues or feature requests at [GitHub Issues](https://github.com/DiggingForDinos/HomeAssistantTimeMachine/issues).
- Share feedback on usability so we can keep refining backup workflows.

**If you find this add-on helpful, please ⭐ star the repository!**