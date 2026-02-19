"""Sensor platform for Home Assistant Time Machine."""
from __future__ import annotations

import logging

from homeassistant.components.sensor import SensorEntity, SensorStateClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import TimeMachineCoordinator

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Time Machine sensors from a config entry."""
    coordinator: TimeMachineCoordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([TimeMachineStatusSensor(coordinator, entry)])


class TimeMachineStatusSensor(CoordinatorEntity[TimeMachineCoordinator], SensorEntity):
    """Sensor that shows the live status of the Time Machine addon."""

    _attr_has_entity_name = True
    _attr_name = "Status"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_icon = "mdi:backup-restore"

    def __init__(
        self, coordinator: TimeMachineCoordinator, entry: ConfigEntry
    ) -> None:
        """Initialise sensor."""
        super().__init__(coordinator)
        self._entry = entry
        self._attr_unique_id = f"{entry.entry_id}_status"
        self._attr_device_info = {
            "identifiers": {(DOMAIN, entry.entry_id)},
            "name": "Home Assistant Time Machine",
            "manufacturer": "Home Assistant Time Machine",
            "model": "Time Machine Addon",
            "sw_version": coordinator.data.get("version") if coordinator.data else None,
            "configuration_url": coordinator.url,
        }

    @property
    def native_value(self) -> str:
        """Return the sensor state derived from coordinator data."""
        if self.coordinator.last_update_success and self.coordinator.data:
            return "Online"
        return "Offline"

    @property
    def extra_state_attributes(self) -> dict:
        """Return extra attributes from the health response."""
        data = self.coordinator.data or {}
        return {
            "version": data.get("version"),
            "backup_count": data.get("backup_count"),
            "last_backup": data.get("last_backup"),
            "active_schedules": data.get("active_schedules"),
            "disk_total_gb": data.get("disk_usage", {}).get("total_gb"),
            "disk_free_gb": data.get("disk_usage", {}).get("free_gb"),
            "disk_used_pct": data.get("disk_usage", {}).get("used_pct"),
            "last_backup_status": data.get("last_backup_status"),
            "last_backup_error": data.get("last_backup_error"),
            "addon_url": self.coordinator.url,
        }
