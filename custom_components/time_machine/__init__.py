"""The Home Assistant Time Machine integration."""
from __future__ import annotations

import asyncio
import logging

import aiohttp

from homeassistant.config_entries import ConfigEntry, SOURCE_IMPORT
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import ConfigEntryNotReady
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.typing import ConfigType

from .const import API_BACKUP_NOW, API_HEALTH, CONF_SCAN_INTERVAL, CONF_URL, DEFAULT_SCAN_INTERVAL, DEFAULT_URL, DOMAIN, PLATFORMS
from .coordinator import TimeMachineCoordinator

_LOGGER = logging.getLogger(__name__)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Import YAML config into a config entry if no entry exists yet."""
    if DOMAIN not in config:
        return True

    conf = config[DOMAIN]
    url = conf.get(CONF_URL, DEFAULT_URL).rstrip("/")
    scan_interval = conf.get(CONF_SCAN_INTERVAL, DEFAULT_SCAN_INTERVAL)

    # Only import if there is no existing config entry for this URL
    existing = [
        e for e in hass.config_entries.async_entries(DOMAIN)
        if e.data.get(CONF_URL, "").rstrip("/") == url
    ]
    if not existing:
        _LOGGER.info(
            "Detected YAML config for Time Machine — importing automatically into UI"
        )
        hass.async_create_task(
            hass.config_entries.flow.async_init(
                DOMAIN,
                context={"source": SOURCE_IMPORT},
                data={CONF_URL: url, CONF_SCAN_INTERVAL: scan_interval},
            )
        )
    else:
        _LOGGER.info(
            "YAML config detected but a config entry already exists — skipping import"
        )

    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Home Assistant Time Machine from a config entry."""
    url = _resolve_url(entry)
    scan_interval = _resolve_scan_interval(entry)

    # Verify the addon is reachable before fully loading
    session = async_get_clientsession(hass)
    try:
        async with asyncio.timeout(10):
            async with session.get(url.rstrip("/") + API_HEALTH) as resp:
                if resp.status != 200:
                    raise ConfigEntryNotReady(
                        f"Time Machine returned HTTP {resp.status}"
                    )
    except (aiohttp.ClientError, asyncio.TimeoutError) as err:
        raise ConfigEntryNotReady(
            f"Cannot connect to Time Machine at {url}: {err}"
        ) from err

    coordinator = TimeMachineCoordinator(hass, url, scan_interval)
    await coordinator.async_config_entry_first_refresh()

    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = coordinator

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    # Register the backup_now service (idempotent — only register once)
    if not hass.services.has_service(DOMAIN, "backup_now"):
        async def handle_backup_now(call: ServiceCall) -> None:
            """Handle the backup_now service call."""
            # Allow overriding the URL per-call
            service_url = call.data.get(CONF_URL, url)
            _LOGGER.info("Triggering Time Machine backup at %s", service_url)
            try:
                async with asyncio.timeout(30):
                    async with session.post(
                        service_url.rstrip("/") + API_BACKUP_NOW
                    ) as response:
                        if response.status == 200:
                            _LOGGER.info("Backup triggered successfully")
                        else:
                            _LOGGER.error(
                                "Failed to trigger backup: HTTP %s", response.status
                            )
            except Exception as err:  # pylint: disable=broad-except
                _LOGGER.error("Error triggering backup: %s", err)

        hass.services.async_register(DOMAIN, "backup_now", handle_backup_now)

    entry.async_on_unload(entry.add_update_listener(_async_update_listener))
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        hass.data[DOMAIN].pop(entry.entry_id)
        # Remove the service when the last entry is removed
        if not hass.data[DOMAIN]:
            hass.services.async_remove(DOMAIN, "backup_now")
    return unload_ok


async def _async_update_listener(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Handle options update — reload the entry so the coordinator picks up new settings."""
    await hass.config_entries.async_reload(entry.entry_id)


def _resolve_url(entry: ConfigEntry) -> str:
    """Return the URL from options (preferred) or data."""
    return entry.options.get(CONF_URL) or entry.data.get(CONF_URL, "")


def _resolve_scan_interval(entry: ConfigEntry) -> int:
    """Return the scan interval from options or data."""
    return int(
        entry.options.get(CONF_SCAN_INTERVAL)
        or entry.data.get(CONF_SCAN_INTERVAL, DEFAULT_SCAN_INTERVAL)
    )
