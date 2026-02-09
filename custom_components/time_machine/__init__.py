"""The Home Assistant Time Machine integration."""
import logging
import aiohttp
import async_timeout

from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType

from .const import DOMAIN, API_BACKUP_NOW

_LOGGER = logging.getLogger(__name__)

async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the Home Assistant Time Machine component."""
    conf = config.get(DOMAIN, {})
    default_url = conf.get("url", "http://192.168.1.4:54000")

    async def handle_backup_now(call):
        """Handle the service call."""
        url = call.data.get("url", default_url)
        _LOGGER.info("Triggering Time Machine backup at %s", url)
        
        async with aiohttp.ClientSession() as session:
            try:
                with async_timeout.timeout(10):
                    async with session.post(f"{url}{API_BACKUP_NOW}") as response:
                        if response.status == 200:
                            _LOGGER.info("Backup triggered successfully")
                        else:
                            _LOGGER.error("Failed to trigger backup: %s", response.status)
            except Exception as err:
                _LOGGER.error("Error triggering backup: %s", err)

    hass.services.async_register(DOMAIN, "backup_now", handle_backup_now)
    
    return True
