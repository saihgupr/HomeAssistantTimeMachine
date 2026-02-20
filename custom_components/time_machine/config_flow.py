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

import os

async def _async_test_connection(url: str) -> bool:
    """Return True if the Time Machine server is reachable."""
    try:
        async with aiohttp.ClientSession() as session:
            async with asyncio.timeout(5):
                async with session.get(f"{url}/api/health") as resp:
                    return resp.status == 200
    except Exception:
        return False

async def _async_discover_addon_url() -> str | None:
    """Discover the Add-on URL via the Supervisor API."""
    token = os.environ.get("SUPERVISOR_TOKEN")
    if not token:
        return None
        
    try:
        async with aiohttp.ClientSession() as session:
            headers = {"Authorization": f"Bearer {token}"}
            async with asyncio.timeout(5):
                async with session.get("http://supervisor/addons", headers=headers) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        addons = data.get("data", {}).get("addons", [])
                        for addon in addons:
                            if addon.get("name") == "Home Assistant Time Machine" or "time_machine" in addon.get("slug", ""):
                                slug = addon["slug"]
                                async with session.get(f"http://supervisor/addons/{slug}/info", headers=headers) as info_resp:
                                    if info_resp.status == 200:
                                        info_data = await info_resp.json()
                                        hostname = info_data.get("data", {}).get("hostname")
                                        if hostname:
                                            url = f"http://{hostname}:54000"
                                            if await _async_test_connection(url):
                                                return url
    except Exception:
        pass
    return None

class TimeMachineConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Home Assistant Time Machine."""

    VERSION = 1

    def __init__(self):
        """Initialize the config flow."""
        self.discovered_url = None

    async def async_step_import(self, user_input=None):
        """Handle import from configuration.yaml."""
        if not user_input or CONF_URL not in user_input:
            return self.async_abort(reason="unknown")
            
        url = user_input[CONF_URL].strip().rstrip("/")
        await self.async_set_unique_id(url)
        self._abort_if_unique_id_configured()
        
        return self.async_create_entry(
            title="Time Machine (Imported)",
            data={CONF_URL: url},
        )

    async def async_step_user(self, user_input=None):
        """Handle the initial step."""
        if self.discovered_url is None:
            self.discovered_url = await _async_discover_addon_url()
            
        errors = {}

        if user_input is not None:
            url = user_input[CONF_URL].strip().rstrip("/")
            reachable = await _async_test_connection(url)
            if reachable:
                await self.async_set_unique_id(url)
                self._abort_if_unique_id_configured()
                return self.async_create_entry(
                    title="Time Machine",
                    data={CONF_URL: url},
                )
            errors["base"] = "cannot_connect"

        default_url = self.discovered_url or DEFAULT_URL

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(
                        CONF_URL,
                        default=user_input.get(CONF_URL, default_url) if user_input else default_url,
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
            url = user_input[CONF_URL].strip().rstrip("/")
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
