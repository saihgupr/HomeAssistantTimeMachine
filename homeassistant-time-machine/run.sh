#!/bin/sh
export NODE_ENV="${NODE_ENV:-production}"
export HOST="${HOST:-0.0.0.0}"
export PORT="${PORT:-54000}"

echo "======================================"
echo "Home Assistant Time Machine v2.1.0"
echo "======================================"
echo "Starting server..."
echo "SUPERVISOR_TOKEN=${SUPERVISOR_TOKEN:+PRESENT}"
echo "HASSIO_TOKEN=${HASSIO_TOKEN:+PRESENT}"
echo "INGRESS_ENTRY=${INGRESS_ENTRY:-'(not set)'}"
echo "NODE_ENV=${NODE_ENV}"
echo "HOST=${HOST}"
echo "PORT=${PORT}"
echo "======================================"

# Check if running in add-on mode
if [ -f /data/options.json ]; then
    echo "[run.sh] Detected add-on mode (/data/options.json exists)"
    echo "[run.sh] Add-on ingress mode will be enabled automatically"
fi

node app.js