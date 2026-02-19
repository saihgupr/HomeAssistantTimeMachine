"""Sensor platform for Home Assistant Time Machine."""
import logging
from datetime import timedelta
import aiohttp
import async_timeout

from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers.event import async_track_time_interval

from .const import DOMAIN, API_HEALTH

_LOGGER = logging.getLogger(__name__)

SCAN_INTERVAL = timedelta(seconds=30)

async def async_setup_platform(hass, config, async_add_entities, discovery_info=None):
    """Set up the Time Machine sensors."""
    url = config.get("url", "http://192.168.1.4:54000")
    sensors = [TimeMachineHealthSensor(url)]
    async_add_entities(sensors, True)

class TimeMachineHealthSensor(SensorEntity):
    """Representation of a Time Machine Health sensor."""

    def __init__(self, url):
        """Initialize the sensor."""
        self._url = url
        self._state = None
        self._attr_name = "Time Machine Status"
        self._attr_unique_id = "time_machine_v2_status"

    @property
    def state(self):
        """Return the state of the sensor."""
        return self._state

    async def async_update(self):
        """Fetch new state data for the sensor."""
        async with aiohttp.ClientSession() as session:
            try:
                with async_timeout.timeout(5):
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
                                "last_backup_status": data.get("last_backup_status")
                            }
                        else:
                            _LOGGER.error("Error fetching Time Machine health: %s (response: %s)", response.status, await response.text())
                            self._state = "Error"
            except Exception as err:
                _LOGGER.error("Failed to connect to Time Machine at %s: %s", self._url, err)
                self._state = "Offline"
