"""Config flow for Home Assistant Time Machine integration."""
from __future__ import annotations

import asyncio
import logging
from typing import Any

import aiohttp
import voluptuous as vol

from homeassistant.config_entries import ConfigEntry, ConfigFlow, OptionsFlow
from homeassistant.core import HomeAssistant, callback
from homeassistant.data_entry_flow import FlowResult
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import (
    API_HEALTH,
    CONF_SCAN_INTERVAL,
    CONF_URL,
    DEFAULT_SCAN_INTERVAL,
    DEFAULT_URL,
    DOMAIN,
)

_LOGGER = logging.getLogger(__name__)


async def _validate_connection(hass: HomeAssistant, url: str) -> dict[str, str]:
    """Validate the URL by hitting the health endpoint.

    Returns an error dict (empty on success).
    """
    session = async_get_clientsession(hass)
    health_url = url.rstrip("/") + API_HEALTH
    try:
        async with asyncio.timeout(10):
            async with session.get(health_url) as resp:
                if resp.status == 200:
                    return {}
                return {"base": "cannot_connect"}
    except asyncio.TimeoutError:
        return {"base": "timeout_connect"}
    except aiohttp.ClientError:
        return {"base": "cannot_connect"}
    except Exception:  # pylint: disable=broad-except
        _LOGGER.exception("Unexpected error validating Time Machine connection")
        return {"base": "unknown"}


class TimeMachineConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Home Assistant Time Machine."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Handle the initial step."""
        errors: dict[str, str] = {}

        if user_input is not None:
            url = user_input[CONF_URL].rstrip("/")
            errors = await _validate_connection(self.hass, url)

            if not errors:
                # Avoid duplicate entries for the same URL
                await self.async_set_unique_id(url)
                self._abort_if_unique_id_configured()

                return self.async_create_entry(
                    title="Home Assistant Time Machine",
                    data={
                        CONF_URL: url,
                        CONF_SCAN_INTERVAL: user_input.get(
                            CONF_SCAN_INTERVAL, DEFAULT_SCAN_INTERVAL
                        ),
                    },
                )

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_URL, default=DEFAULT_URL): str,
                    vol.Optional(
                        CONF_SCAN_INTERVAL, default=DEFAULT_SCAN_INTERVAL
                    ): vol.All(vol.Coerce(int), vol.Range(min=10, max=3600)),
                }
            ),
            errors=errors,
        )

    async def async_step_import(
        self, import_data: dict[str, Any]
    ) -> FlowResult:
        """Handle import from YAML configuration — no UI shown."""
        url = import_data.get(CONF_URL, DEFAULT_URL).rstrip("/")
        scan_interval = import_data.get(CONF_SCAN_INTERVAL, DEFAULT_SCAN_INTERVAL)

        # Avoid duplicates
        await self.async_set_unique_id(url)
        self._abort_if_unique_id_configured()

        # Validate the connection before creating the entry
        errors = await _validate_connection(self.hass, url)
        if errors:
            _LOGGER.warning(
                "Could not import YAML config for Time Machine at %s: %s",
                url,
                errors,
            )
            return self.async_abort(reason="cannot_connect")

        _LOGGER.info("Successfully imported Time Machine YAML config for %s", url)
        return self.async_create_entry(
            title="Home Assistant Time Machine",
            data={CONF_URL: url, CONF_SCAN_INTERVAL: scan_interval},
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> TimeMachineOptionsFlow:
        """Return the options flow handler."""
        return TimeMachineOptionsFlow(config_entry)


class TimeMachineOptionsFlow(OptionsFlow):
    """Handle options for Home Assistant Time Machine."""

    def __init__(self, config_entry: ConfigEntry) -> None:
        """Initialize options flow."""
        self._config_entry = config_entry

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Manage the options."""
        errors: dict[str, str] = {}

        current_url = self._config_entry.data.get(CONF_URL, DEFAULT_URL)
        current_interval = self._config_entry.data.get(
            CONF_SCAN_INTERVAL, DEFAULT_SCAN_INTERVAL
        )
        # Options override data if set
        current_url = self._config_entry.options.get(CONF_URL, current_url)
        current_interval = self._config_entry.options.get(
            CONF_SCAN_INTERVAL, current_interval
        )

        if user_input is not None:
            url = user_input[CONF_URL].rstrip("/")
            errors = await _validate_connection(self.hass, url)

            if not errors:
                return self.async_create_entry(
                    title="",
                    data={
                        CONF_URL: url,
                        CONF_SCAN_INTERVAL: user_input.get(
                            CONF_SCAN_INTERVAL, DEFAULT_SCAN_INTERVAL
                        ),
                    },
                )

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_URL, default=current_url): str,
                    vol.Optional(
                        CONF_SCAN_INTERVAL, default=current_interval
                    ): vol.All(vol.Coerce(int), vol.Range(min=10, max=3600)),
                }
            ),
            errors=errors,
        )
