# Cinemachine

*Turn toy play into animated movies. Just press record.*

## Inspiration

Every kid is a storyteller. Watch any child pick up a toy dinosaur and a stuffed bear, and within seconds they've built a world — complete with dialogue, drama, and plot twists. But that magic lives only in the moment. We wanted to give kids a way to capture that creativity and turn it into something they can watch, share, and be proud of — a real animated movie, made from nothing but their imagination and their toys.

## What it does

Cinemachine lets kids create animated movies using their real toys. A child places a toy in front of a fixed camera, acts out a scene by moving the toy and speaking dialogue, and Cinemachine does the rest:

- **Segments the toy** from the video, cleanly separating it from the child's hands and background
- **Generates a fantasy world** as the backdrop — a forest, a castle, outer space — based on what the kid describes through a voice conversation
- **Adds eyes, mouth, and lip sync** to the toy, bringing it to life as a character
- **Applies subtle animations** so the toy feels alive — breathing, bouncing, reacting

The result is a polished animated short film, created entirely from a kid's play session.

## How we built it

We built Cinemachine as a full-stack real-time application with a split architecture:

- **Frontend**: Vanilla JavaScript with Web Components, bundled with Vite. We use the Web Audio API with AudioWorklets for real-time mic capture, the Canvas API for 24fps video composition with Ken Burns panning and crossfade transitions, and the MediaRecorder API for scene recording.
- **Backend**: Python with FastAPI, running on Uvicorn. The server manages WebSocket connections for bidirectional PCM audio streaming at 16kHz between the browser and the Gemini Live API.
- **AI Director**: The Gemini Live API (model: `gemini-live-2.5-flash-native-audio`) acts as "CineMachine" — an enthusiastic movie director that guides kids through character registration, scene recording, and story development via real-time voice conversation. It uses function calling to orchestrate the entire pipeline.
- **Background Removal**: We use `rembg` with the `isnet-general-use` model (optimized for objects rather than humans) to segment toys from the video frames. We added alpha matting and Gaussian blur post-processing for clean, artifact-free cutouts.
- **World Generation**: Imagen 3.0 (`imagen-3.0-generate-002`) generates Pixar-style animated backgrounds based on the story setting the kid describes — jungles, castles, oceans, space — in 16:9 cinematic aspect ratio.
- **Video Composition**: The browser composites foreground toys onto generated backgrounds using a canvas pipeline: Ken Burns zoom/pan on backgrounds, crossfade transitions between frames, soft drop shadows for depth, all rendered at 1280x720 at 24fps and recorded as WebM.
- **Deployment**: Dockerized multi-stage build (Node for frontend, Python for backend) deployed to Google Cloud Run with session affinity for WebSocket persistence.

## Challenges we ran into

- **Real-time bidirectional audio streaming**: Getting low-latency PCM audio flowing in both directions over WebSockets while simultaneously processing video frames required careful async queue management — we run 3+ concurrent tasks per session (send audio, send video, receive responses).
- **Toy segmentation vs. human detection**: Most background removal models are trained on people. The default `u2net` model kept detecting hands instead of toys. Switching to `isnet-general-use` and adding image upscaling (to min 512px) for small toy close-ups solved this.
- **Frame extraction from WebM blobs**: MediaRecorder produces opaque WebM blobs that are hard to extract individual frames from. We solved this by capturing frames live from the camera canvas at 500ms intervals during recording, running in parallel with the MediaRecorder.
- **Canvas rendering at 24fps without frame drops**: `requestAnimationFrame` didn't give us consistent timing for video recording. Switching to `setTimeout` with explicit frame timing gave us reliable 24fps output for the MediaRecorder to capture.
- **Imagen generation latency**: Background generation takes 3-5 seconds. We built a fallback system that generates procedural gradient backgrounds (color-matched to the story setting) so the pipeline never stalls.

## Accomplishments that we're proud of

- **End-to-end real-time pipeline**: A kid can talk to an AI director, record scenes with toys, and get back composed animated videos — all in one session, with no manual editing.
- **The AI director actually works**: CineMachine proactively guides kids through moviemaking — greeting them, helping plan the story, calling "Action!" and "Cut!", and celebrating their creativity. It feels like having a real director in the room.
- **Clean toy isolation**: The combination of `isnet-general-use`, alpha matting, upscaling, and Gaussian blur produces surprisingly clean cutouts — even for small, oddly-shaped toys held in a kid's hands.
- **Cinematic composition quality**: The Ken Burns effect, crossfade transitions, and soft shadows make the final output look like a real animated short, not a hacky overlay.
- **Zero-install experience**: Kids just open a browser, tap a button, and start making movies. No apps to download, no accounts to create.

## What we learned

- **Model selection matters more than post-processing**: Switching from `u2net` to `isnet-general-use` for background removal did more for quality than any amount of alpha matting or edge smoothing.
- **Gemini Live's function calling is powerful for orchestration**: Instead of building a complex state machine, we let the AI model decide when to call pipeline tools based on the conversation flow. This made the system feel natural rather than scripted.
- **Kids don't follow scripts**: Our initial flow assumed kids would neatly register characters, then record scenes in order. In testing, kids jump around — introducing new characters mid-scene, wanting to redo things, changing the story entirely. The system had to be flexible enough to handle chaos.
- **Browser APIs are surprisingly capable**: Canvas composition, MediaRecorder, AudioWorklets, WebSockets — modern browsers can do real-time video production without any plugins or native code.
- **Fallbacks are essential for demos**: Imagen might be slow, rembg might fail on a weird frame, the WebSocket might hiccup. Every pipeline step needed a graceful fallback to keep the experience smooth.

## What's next for Cinemachine

- **Multiple characters** — Support multiple toys in a single scene interacting with each other
- **Character voices** — Generate unique character voices instead of using the kid's raw audio
- **Scene transitions** — Auto-cut and transition between scenes for a more cinematic feel
- **Music and sound effects** — AI-generated background music and sound effects matching the story mood
- **Export and share** — Let kids share their movies with family or on a kid-safe platform
- **Story templates** — Pre-built story structures (adventure, mystery, comedy) to guide kids who need a starting point
