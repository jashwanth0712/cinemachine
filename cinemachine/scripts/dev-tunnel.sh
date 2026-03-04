#!/bin/bash
# Start Expo dev server with ngrok tunnel
# Accessible from any network — scan the QR code in Expo Go
cd "$(dirname "$0")/.." && npx expo start --tunnel
