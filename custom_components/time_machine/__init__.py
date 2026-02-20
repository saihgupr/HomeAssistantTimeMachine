"""The Home Assistant Time Machine integration."""
import asyncio
import logging

import aiohttp

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType

from .const import DOMAIN, API_BACKUP_NOW, CONF_URL

_LOGGER = logging.getLogger(__name__)

PLATFORMS = ["sensor"]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the Home Assistant Time Machine component (YAML legacy)."""
    if DOMAIN in config:
        conf = config[DOMAIN]
        if conf and CONF_URL in conf:
            hass.async_create_task(
                hass.config_entries.flow.async_init(
                    DOMAIN,
                    context={"source": "import"},
                    data=conf,
                )
            )
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Time Machine from a config entry."""
    url = entry.options.get(CONF_URL) or entry.data.get(CONF_URL, "")
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {"url": url}

    async def handle_backup_now(call):
        """Handle the backup_now service call."""
        service_url = call.data.get("url") or url
        _LOGGER.info("Triggering Time Machine backup at %s", service_url)
        
        payload = {}
        if "smart_backup_enabled" in call.data:
            payload["smartBackupEnabled"] = call.data["smart_backup_enabled"]
        if "max_backups_enabled" in call.data:
            payload["maxBackupsEnabled"] = call.data["max_backups_enabled"]
        if "max_backups_count" in call.data:
            payload["maxBackupsCount"] = call.data["max_backups_count"]
        if "live_config_path" in call.data:
            payload["liveFolderPath"] = call.data["live_config_path"]
        if "backup_folder_path" in call.data:
            payload["backupFolderPath"] = call.data["backup_folder_path"]
        if "timezone" in call.data:
            payload["timezone"] = call.data["timezone"]
            
        try:
            async with aiohttp.ClientSession() as session:
                async with asyncio.timeout(10):
                    async with session.post(f"{service_url}{API_BACKUP_NOW}", json=payload) as response:
                        if response.status == 200:
                            _LOGGER.info("Backup triggered successfully")
                        else:
                            _LOGGER.error("Failed to trigger backup: %s", response.status)
        except Exception as err:
            _LOGGER.error("Error triggering backup: %s", err)

    hass.services.async_register(DOMAIN, "backup_now", handle_backup_now)

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    entry.async_on_unload(entry.add_update_listener(_async_update_listener))
    return True


async def _async_update_listener(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Handle options update."""
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        hass.data[DOMAIN].pop(entry.entry_id, None)
    return unload_ok
