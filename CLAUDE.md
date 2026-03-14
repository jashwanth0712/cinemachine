# Gemini Live Negotiation Coach

Real-time AI negotiation coach powered by Gemini Live API. Listens to in-person negotiations via microphone and provides whispered audio coaching using techniques from "Never Split the Difference" by Chris Voss (mirroring, labeling, tactical empathy, calibrated questions, effective pauses).

## Architecture

```
Mobile/Web Client  <--WebSocket-->  FastAPI Server  <--Gemini Live API-->  Google Gemini
(audio in/out)                      (port 8000)                           (gemini-2.5-flash-native-audio)
```

- **server/** — Python FastAPI backend. Proxies audio between clients and Gemini Live API via WebSocket (`/ws`). Handles tool calls for negotiation technique suggestions.
- **frontend/** — Expo/React Native mobile app (iOS & Android). Records microphone audio, streams to backend, plays back Gemini's audio responses.
- **web/** — Next.js web client. Same functionality as mobile app but runs in browser at `localhost:3000`.

## Key Files

| File | Purpose |
|------|---------|
| `server/main.py` | FastAPI server, Gemini session management, WebSocket handler, system prompt, tool definitions |
| `frontend/app/index.tsx` | Mobile app main screen (orb UI, connect/disconnect) |
| `frontend/hooks/useAudioConnection.ts` | WebSocket connection, audio recording/playback, PCM streaming logic |
| `frontend/components/OrbComponent.tsx` | Animated orb visual indicator |
| `web/app/page.tsx` | Web client main page |
| `web/components/Orb.tsx` | Web orb component |
| `restart.sh` | Starts both backend and web servers |

## Prerequisites

- Python 3.12+
- Node.js 18+
- Xcode (for iOS simulator)
- `GOOGLE_API_KEY` environment variable set in `server/.env`

## Running

### Backend (required for all clients)

```bash
cd server
source venv/bin/activate        # activate venv (create with: python -m venv venv && pip install -r requirements.txt)
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Mobile App (Expo)

```bash
cd frontend
npm install                     # first time only
npx expo run:ios                # iOS simulator (uses ws://localhost:8000/ws)
npx expo run:android            # Android emulator
```

For physical devices: update `BACKEND_URL` in `frontend/hooks/useAudioConnection.ts` to your machine's local IP (`ipconfig getifaddr en0`).

### Web Client

```bash
cd web
npm install                     # first time only
npm run dev                     # runs at http://localhost:3000
```

### Quick Start (backend + web)

```bash
./restart.sh
```

## Audio Pipeline

1. Client records 16kHz PCM audio → base64-encodes → sends as `audio_chunk` over WebSocket
2. Server forwards raw PCM bytes to Gemini Live API via `send_realtime_input`
3. Gemini responds with 24kHz PCM audio + optional tool calls (negotiation techniques)
4. Server base64-encodes response audio → sends back to client as `audio_response`
5. Client decodes, converts Int16 PCM → Float32, plays via `AudioContext` with buffer queue

## Environment Variables

| Variable | Location | Description |
|----------|----------|-------------|
| `GOOGLE_API_KEY` | `server/.env` | Google AI API key for Gemini |

## Logs

- Backend: `tail -f /tmp/backend.log`
- Web: `tail -f /tmp/web.log`
