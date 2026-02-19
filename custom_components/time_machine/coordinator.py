"""DataUpdateCoordinator for Home Assistant Time Machine."""
from __future__ import annotations

import asyncio
import logging
from datetime import timedelta

import aiohttp

from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .const import API_HEALTH, DOMAIN

_LOGGER = logging.getLogger(__name__)


class TimeMachineCoordinator(DataUpdateCoordinator[dict]):
    """Coordinator that fetches health data from the Time Machine API."""

    def __init__(
        self, hass: HomeAssistant, url: str, scan_interval: int
    ) -> None:
        """Initialise the coordinator."""
        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            update_interval=timedelta(seconds=scan_interval),
        )
        self.url = url
        self._health_url = url.rstrip("/") + API_HEALTH

    async def _async_update_data(self) -> dict:
        """Fetch data from the health endpoint."""
        session = async_get_clientsession(self.hass)
        try:
            async with asyncio.timeout(10):
                async with session.get(self._health_url) as resp:
                    if resp.status != 200:
                        raise UpdateFailed(
                            f"Unexpected status {resp.status} from Time Machine"
                        )
                    return await resp.json()
        except asyncio.TimeoutError as exc:
            raise UpdateFailed("Timeout connecting to Time Machine") from exc
        except aiohttp.ClientError as exc:
            raise UpdateFailed(f"Error communicating with Time Machine: {exc}") from exc
