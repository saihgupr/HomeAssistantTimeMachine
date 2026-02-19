"""Sensor platform for Home Assistant Time Machine."""
import asyncio
import logging
from datetime import timedelta

import aiohttp

from homeassistant.components.sensor import SensorEntity
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.typing import ConfigType, DiscoveryInfoType

from .const import DOMAIN, API_HEALTH, CONF_URL

_LOGGER = logging.getLogger(__name__)

SCAN_INTERVAL = timedelta(seconds=30)


async def async_setup_platform(
    hass: HomeAssistant,
    config: ConfigType,
    async_add_entities: AddEntitiesCallback,
    discovery_info: DiscoveryInfoType | None = None,
) -> None:
    """Set up the Time Machine sensor from YAML."""
    # Get URL from global domain config or platform config
    url = config.get(CONF_URL) or hass.data.get(DOMAIN, {}).get("url", "http://homeassistant-time-machine:54000")
    async_add_entities([TimeMachineHealthSensor(url)], True)


class TimeMachineHealthSensor(SensorEntity):
    """Representation of a Time Machine Health sensor."""

    _attr_has_entity_name = True
    _attr_name = "Time Machine Status"
    _attr_entity_picture = "/time_machine_local"

    def __init__(self, url: str) -> None:
        """Initialize the sensor."""
        self._url = url
        self._state = None
        self._attr_unique_id = "time_machine_v2_status"
        self._attr_device_info = {
            "identifiers": {(DOMAIN, "time_machine_v2")},
            "name": "Time Machine",
            "manufacturer": "Home Assistant Time Machine",
        }

    @property
    def state(self):
        """Return the state of the sensor."""
        return self._state

    async def async_update(self) -> None:
        """Fetch new state data for the sensor."""
        try:
            async with aiohttp.ClientSession() as session:
                async with asyncio.timeout(5):
                    async with session.get(f"{self._url}{API_HEALTH}") as response:
                        if response.status == 200:
                            data = await response.json()
                            self._state = "Online"
                            _LOGGER.debug("Time Machine health data: %s", data)
                            self._attr_extra_state_attributes = {
                                "version": data.get("version"),
                                "backup_count": data.get("backup_count"),
                                "last_backup": data.get("last_backup"),
                                "active_schedules": data.get("active_schedules"),
                                "disk_total_gb": data.get("disk_usage", {}).get("total_gb"),
                                "disk_free_gb": data.get("disk_usage", {}).get("free_gb"),
                                "disk_used_pct": data.get("disk_usage", {}).get("used_pct"),
                                "last_backup_status": data.get("last_backup_status"),
                            }
                        else:
                            _LOGGER.error(
                                "Error fetching Time Machine health: %s", response.status
                            )
                            self._state = "Error"
        except Exception as err:
            _LOGGER.error(
                "Failed to connect to Time Machine at %s: %s", self._url, err
            )
            self._state = "Offline"
