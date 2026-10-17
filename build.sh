#!/usr/bin/env bash
# Render Native Python Build Script
set -e

echo "=== Installing Python dependencies ==="
pip install --upgrade pip
pip install -r requirements.txt

echo "=== Building React Web Frontend ==="
cd web
npm install
npm run build
cd ..

echo "=== Build Complete ==="
