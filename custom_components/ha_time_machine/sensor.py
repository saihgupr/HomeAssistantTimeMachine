"""Sensor platform for Home Assistant Time Machine."""
import logging
from datetime import timedelta
import aiohttp
import async_timeout

from homeassistant.components.sensor import SensorEntity
from homeassistant.helpers.event import async_track_time_interval

from .const import DOMAIN, API_HEALTH

_LOGGER = logging.getLogger(__name__)

SCAN_INTERVAL = timedelta(minutes=5)

async def async_setup_platform(hass, config, async_add_entities, discovery_info=None):
    """Set up the Time Machine sensors."""
    url = config.get("url", "http://homeassistant-time-machine:54000")
    sensors = [TimeMachineHealthSensor(url)]
    async_add_entities(sensors, True)

class TimeMachineHealthSensor(SensorEntity):
    """Representation of a Time Machine Health sensor."""

    def __init__(self, url):
        """Initialize the sensor."""
        self._url = url
        self._state = None
        self._attr_name = "Time Machine Status"
        self._attr_unique_id = f"{DOMAIN}_health"

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
                            self._attr_extra_state_attributes = {
                                "version": data.get("version"),
                                "ingress": data.get("ingress"),
                                "timestamp": data.get("timestamp")
                            }
                        else:
                            self._state = "Error"
            except Exception:
                self._state = "Offline"
