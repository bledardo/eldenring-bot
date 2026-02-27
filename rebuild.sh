#!/bin/bash
# Elden Ring Watcher — rebuild from WSL
# Usage: ./rebuild.sh

echo "=== Elden Ring Watcher Build ==="

# Run the PowerShell script from WSL
powershell.exe -ExecutionPolicy Bypass -File "\\\\wsl.localhost\\Debian\\home\\hamza\\eldenring-bot\\rebuild.ps1"
