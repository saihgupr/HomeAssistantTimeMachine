#!/bin/sh
export NODE_ENV="${NODE_ENV:-production}"
export HOST="${HOST:-0.0.0.0}"
export PORT="${PORT:-54000}"

echo "======================================"
echo "Home Assistant Time Machine v2.1"
echo "======================================"
echo "Starting server..."
echo "======================================"

node app.js