# Setup Guide

## Prerequisites

- Python 3.x
- Node.js
- Expo CLI (`npm install -g expo-cli`)
- Xcode (for iOS simulator)

## Backend (FastAPI Server)

```bash
cd server

# Create virtual environment (first time only)
python -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies (first time only)
pip install -r requirements.txt

# Start the server
uvicorn main:app --host 0.0.0.0 --port 8000
```

If port 8000 is already in use:

```bash
lsof -ti:8000 | xargs kill -9
```

## Frontend (Expo / React Native)

```bash
cd frontend

# Install dependencies (first time only)
npm install

# Start Expo
npx expo start

# Run on iOS simulator
npx expo run:ios
```

## Web Client

```bash
cd web

# Install dependencies (first time only)
npm install

# Start dev server
npm run dev
```

Web app runs at http://localhost:3000

## Quick Start (All Servers)

From the project root:

```bash
./restart.sh
```

This starts both the backend (port 8000) and web frontend (port 3000).

## Network Configuration

The WebSocket URL is configured in `frontend/hooks/useAudioConnection.ts`.

- **iOS Simulator**: `ws://localhost:8000/ws` (shares host network)
- **Physical device**: Replace `localhost` with your computer's local IP on the same WiFi network. Find it with:

```bash
ipconfig getifaddr en0
```

## Logs

- Backend: `tail -f /tmp/backend.log`
- Web: `tail -f /tmp/web.log`
