"""The Home Assistant Time Machine integration."""
import asyncio
import logging
import os

import aiohttp

from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType

from .const import DOMAIN, API_BACKUP_NOW, CONF_URL

_LOGGER = logging.getLogger(__name__)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the Home Assistant Time Machine component."""
    if DOMAIN not in config:
        return True

    conf = config[DOMAIN]
    url = conf.get(CONF_URL, "http://homeassistant-time-machine:54000").rstrip("/")
    
    # Store for platform setup
    hass.data.setdefault(DOMAIN, {})["url"] = url

    # Register static path for local assets (icon)
    icon_path = os.path.join(os.path.dirname(__file__), "icon.png")
    if os.path.exists(icon_path):
        hass.http.register_static_path("/time_machine_local", icon_path)

    async def handle_backup_now(call):
        """Handle the backup_now service call."""
        service_url = call.data.get("url", url)
        _LOGGER.info("Triggering Time Machine backup at %s", service_url)
        try:
            async with aiohttp.ClientSession() as session:
                async with asyncio.timeout(10):
                    async with session.post(f"{service_url}{API_BACKUP_NOW}") as response:
                        if response.status == 200:
                            _LOGGER.info("Backup triggered successfully")
                        else:
                            _LOGGER.error("Failed to trigger backup: %s", response.status)
        except Exception as err:
            _LOGGER.error("Error triggering backup: %s", err)

    hass.services.async_register(DOMAIN, "backup_now", handle_backup_now)

    return True
