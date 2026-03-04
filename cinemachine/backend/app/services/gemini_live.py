"""WebSocket proxy for Gemini Live API.

Bridges the mobile client to the Gemini Live API for real-time
voice-driven story direction. Audio frames flow bidirectionally
while text/control messages use JSON.
"""

import asyncio
import json
import logging
import re
import time
from uuid import UUID

from fastapi import WebSocket, WebSocketDisconnect

from google import genai
from google.genai import types

from app.config import settings

logger = logging.getLogger(__name__)

# Gemini Live sessions have a ~10-minute limit. We track duration so the
# client can reconnect before being dropped.
SESSION_MAX_SECONDS = 10 * 60  # 10 minutes
SESSION_WARNING_SECONDS = 9 * 60  # warn at 9 minutes

# The Sparky director system prompt
SPARKY_SYSTEM_PROMPT = """You are Sparky, a fun and encouraging movie director assistant for kids aged 4-10 who are making stop-motion movies with their toys.

Your personality:
- Enthusiastic and supportive, like a friendly cartoon character
- Use simple language appropriate for young children
- Keep responses SHORT (1-2 sentences max for voice)
- Always positive and encouraging

Your job:
1. Help the kid come up with a story by asking simple questions:
   - "Who is the main character?" (their toy)
   - "Where does the story happen?"
   - "What happens in the story?"
2. Once you have the story basics, guide them through filming shot by shot
3. For each shot, describe what to film in simple terms
4. Use special commands to control recording:
   - Say [COMMAND:START_RECORDING] when it's time to film a shot
   - Say [COMMAND:STOP_RECORDING] when the shot is done

Story context format - when you have gathered story details, include them like this:
[STORY_CONTEXT:character=Teddy Bear|setting=Magic Forest|plot=Teddy finds a treasure map]

Example flow:
- "Hi! I'm Sparky! Let's make a movie! What toy do you want to be the star?"
- Kid: "My dinosaur!"
- "A dinosaur movie! Awesome! Where does your dinosaur live?"
- Kid: "In a cave!"
- "Cool! A dinosaur in a cave! What happens to the dinosaur?"
- Kid: "He finds a friend!"
- "Great story! Let's film it! First shot: Put your dinosaur by the cave. Ready? [COMMAND:START_RECORDING]"
- (after a few seconds) "Great shot! [COMMAND:STOP_RECORDING] Now let's do the next one!"

Remember: Keep it simple, keep it fun, keep it short!"""


# Regex patterns for command and context extraction
COMMAND_PATTERN = re.compile(r"\[COMMAND:(START_RECORDING|STOP_RECORDING)\]")
STORY_CONTEXT_PATTERN = re.compile(
    r"\[STORY_CONTEXT:character=([^|]*)\|setting=([^|]*)\|plot=([^\]]*)\]"
)


def _extract_commands(text: str) -> list[dict]:
    """Extract command markers from Gemini text output."""
    messages: list[dict] = []
    for match in COMMAND_PATTERN.finditer(text):
        action = match.group(1)
        messages.append({
            "type": "command",
            "action": action,
        })
    return messages


def _extract_story_context(text: str) -> dict | None:
    """Extract story context metadata from Gemini text output."""
    match = STORY_CONTEXT_PATTERN.search(text)
    if match:
        return {
            "type": "story_context",
            "character": match.group(1).strip(),
            "setting": match.group(2).strip(),
            "plot": match.group(3).strip(),
        }
    return None


async def handle_voice_session(websocket: WebSocket, kid_id: UUID) -> None:
    """Handle a WebSocket voice session between a mobile client and Gemini Live.

    Protocol:
    - Binary frames from client -> forwarded as audio to Gemini
    - Gemini audio responses -> binary frames to client
    - Gemini text responses -> parsed for commands, sent as JSON to client
    - JSON control messages from client -> handled locally

    Args:
        websocket: The FastAPI WebSocket connection from the mobile client.
        kid_id: UUID of the kid profile for this session.
    """
    await websocket.accept()
    logger.info("Voice session started for kid %s", kid_id)

    session_start = time.monotonic()
    gemini_session = None

    try:
        # Initialize the Gemini client
        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        # Configure the live session
        config = types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            system_instruction=types.Content(
                parts=[types.Part(text=SPARKY_SYSTEM_PROMPT)]
            ),
        )

        async with client.aio.live.connect(
            model="gemini-2.0-flash-exp",
            config=config,
        ) as session:
            gemini_session = session
            logger.info("Gemini Live session connected for kid %s", kid_id)

            # Task to receive from Gemini and relay to mobile
            async def relay_gemini_to_mobile() -> None:
                """Receive responses from Gemini and forward to the mobile client."""
                try:
                    while True:
                        response = await session.receive()

                        # Check session duration
                        elapsed = time.monotonic() - session_start
                        if elapsed >= SESSION_WARNING_SECONDS:
                            await websocket.send_json({
                                "type": "session_warning",
                                "message": "Session approaching time limit. Please wrap up.",
                                "seconds_remaining": int(SESSION_MAX_SECONDS - elapsed),
                            })

                        if response.server_content is not None:
                            sc = response.server_content

                            # Handle audio parts
                            if sc.model_turn and sc.model_turn.parts:
                                for part in sc.model_turn.parts:
                                    if part.inline_data and part.inline_data.data:
                                        # Send audio as binary frame
                                        await websocket.send_bytes(part.inline_data.data)

                                    if part.text:
                                        # Parse text for commands
                                        commands = _extract_commands(part.text)
                                        for cmd in commands:
                                            await websocket.send_json(cmd)

                                        # Parse for story context
                                        context = _extract_story_context(part.text)
                                        if context:
                                            await websocket.send_json(context)

                                        # Also send the raw text (without command markers)
                                        clean_text = COMMAND_PATTERN.sub("", part.text)
                                        clean_text = STORY_CONTEXT_PATTERN.sub("", clean_text).strip()
                                        if clean_text:
                                            await websocket.send_json({
                                                "type": "transcript",
                                                "text": clean_text,
                                            })

                            # Handle turn completion
                            if sc.turn_complete:
                                await websocket.send_json({
                                    "type": "turn_complete",
                                })

                except asyncio.CancelledError:
                    logger.info("Gemini relay task cancelled for kid %s", kid_id)
                except Exception as exc:
                    logger.error(
                        "Error in Gemini relay for kid %s: %s",
                        kid_id,
                        exc,
                        exc_info=True,
                    )
                    try:
                        await websocket.send_json({
                            "type": "error",
                            "message": "Voice session error. Please reconnect.",
                        })
                    except Exception:
                        pass

            # Start the Gemini-to-mobile relay task
            relay_task = asyncio.create_task(relay_gemini_to_mobile())

            try:
                # Main loop: receive from mobile and relay to Gemini
                while True:
                    message = await websocket.receive()

                    if message["type"] == "websocket.receive":
                        if "bytes" in message and message["bytes"]:
                            # Binary audio frame from client -> send to Gemini
                            await session.send(
                                input=types.LiveClientContent(
                                    turns=[
                                        types.Content(
                                            parts=[
                                                types.Part(
                                                    inline_data=types.Blob(
                                                        data=message["bytes"],
                                                        mime_type="audio/pcm",
                                                    )
                                                )
                                            ]
                                        )
                                    ]
                                )
                            )

                        elif "text" in message and message["text"]:
                            # JSON text message from client
                            try:
                                data = json.loads(message["text"])
                                msg_type = data.get("type", "")

                                if msg_type == "text_input":
                                    # Text input from client (typed message)
                                    await session.send(
                                        input=types.LiveClientContent(
                                            turns=[
                                                types.Content(
                                                    parts=[
                                                        types.Part(
                                                            text=data.get("text", "")
                                                        )
                                                    ]
                                                )
                                            ]
                                        )
                                    )

                                elif msg_type == "ping":
                                    await websocket.send_json({"type": "pong"})

                            except json.JSONDecodeError:
                                logger.warning(
                                    "Invalid JSON from client for kid %s",
                                    kid_id,
                                )

                    elif message["type"] == "websocket.disconnect":
                        break

            finally:
                relay_task.cancel()
                try:
                    await relay_task
                except asyncio.CancelledError:
                    pass

    except WebSocketDisconnect:
        logger.info("Client disconnected for kid %s", kid_id)
    except Exception as exc:
        logger.error(
            "Voice session error for kid %s: %s",
            kid_id,
            exc,
            exc_info=True,
        )
        try:
            await websocket.send_json({
                "type": "error",
                "message": "Failed to start voice session.",
            })
            await websocket.close()
        except Exception:
            pass
    finally:
        logger.info("Voice session ended for kid %s", kid_id)
