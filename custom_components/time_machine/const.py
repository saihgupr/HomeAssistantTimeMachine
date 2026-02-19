"""Constants for the Home Assistant Time Machine integration."""

DOMAIN = "time_machine"

# Platforms
PLATFORMS = ["sensor"]

# API Endpoints
API_HEALTH = "/api/health"
API_BACKUP_NOW = "/api/backup-now"

# Configuration keys
CONF_URL = "url"
CONF_SCAN_INTERVAL = "scan_interval"

# Default values
DEFAULT_NAME = "Home Assistant Time Machine"
DEFAULT_URL = "http://homeassistant-time-machine:54000"
DEFAULT_SCAN_INTERVAL = 30  # seconds
DEFAULT_PORT = 54000
