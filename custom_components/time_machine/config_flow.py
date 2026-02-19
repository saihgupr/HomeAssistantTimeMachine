"""Config flow for Home Assistant Time Machine integration."""
import asyncio
import logging

import aiohttp
import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import callback

from .const import DOMAIN, CONF_URL, DEFAULT_PORT

_LOGGER = logging.getLogger(__name__)

DEFAULT_URL = f"http://homeassistant.local:{DEFAULT_PORT}"


async def _async_test_connection(url: str) -> bool:
    """Return True if the Time Machine server is reachable."""
    try:
        async with aiohttp.ClientSession() as session:
            async with asyncio.timeout(5):
                async with session.get(f"{url}/api/health") as resp:
                    return resp.status == 200
    except Exception:
        return False


class TimeMachineConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Home Assistant Time Machine."""

    VERSION = 1

    async def async_step_user(self, user_input=None):
        """Handle the initial step."""
        errors = {}

        if user_input is not None:
            url = user_input[CONF_URL].rstrip("/")
            reachable = await _async_test_connection(url)
            if reachable:
                await self.async_set_unique_id(url)
                self._abort_if_unique_id_configured()
                return self.async_create_entry(
                    title="Time Machine",
                    data={CONF_URL: url},
                )
            errors["base"] = "cannot_connect"

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(
                        CONF_URL,
                        default=user_input.get(CONF_URL, DEFAULT_URL) if user_input else DEFAULT_URL,
                    ): str,
                }
            ),
            errors=errors,
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        """Return the options flow."""
        return TimeMachineOptionsFlow(config_entry)


class TimeMachineOptionsFlow(config_entries.OptionsFlow):
    """Handle options for Time Machine."""

    def __init__(self, config_entry):
        """Initialize options flow."""
        self.config_entry = config_entry

    async def async_step_init(self, user_input=None):
        """Manage the options."""
        errors = {}

        if user_input is not None:
            url = user_input[CONF_URL].rstrip("/")
            reachable = await _async_test_connection(url)
            if reachable:
                return self.async_create_entry(title="", data={CONF_URL: url})
            errors["base"] = "cannot_connect"

        current_url = self.config_entry.options.get(
            CONF_URL, self.config_entry.data.get(CONF_URL, DEFAULT_URL)
        )

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_URL, default=current_url): str,
                }
            ),
            errors=errors,
        )
