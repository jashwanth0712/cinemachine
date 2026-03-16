import "./audio-visualizer.js";
import "./live-transcript.js";
import {
  GeminiLiveAPI,
  MultimodalLiveResponseType,
  FunctionCallDefinition,
} from "../lib/gemini-live/geminilive.js";
import {
  AudioStreamer,
  AudioPlayer,
  VideoStreamer,
} from "../lib/gemini-live/mediaUtils.js";

class ViewStoryMode extends HTMLElement {
  constructor() {
    super();
    this.characters = [];
    this.scenes = [];
    this.currentScene = null;
    this.isRecording = false;
    this.mediaRecorder = null;
    this.recordedChunks = [];
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
    if (this.videoStreamer) this.videoStreamer.stop();
    if (this.audioStreamer) this.audioStreamer.stop();
    if (this.client) this.client.disconnect();
  }

  render() {
    this.innerHTML = `
      <button id="back-to-missions" style="
        position: absolute;
        top: var(--spacing-md);
        left: var(--spacing-md);
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 8px;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        opacity: 0.7;
        transition: opacity 0.2s;
        z-index: 10;
      " onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.7">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
      </button>

      <div class="container" style="justify-content: space-between; min-height: 100vh; position: relative; padding-bottom: var(--spacing-xl);">

        <div style="margin-top: var(--spacing-xl); text-align: center;">
          <h2 style="font-size: 1.5rem; margin-bottom: 2px; display: flex; align-items: center; justify-content: center; gap: 8px;">
            CineMachine
            <span style="
              background: var(--color-accent-primary);
              color: white;
              font-size: 0.6rem;
              font-weight: 800;
              padding: 2px 6px;
              border-radius: var(--radius-sm);
              text-transform: uppercase;
              letter-spacing: 0.5px;
            ">NEW</span>
          </h2>
          <p style="opacity: 0.7; font-size: 1rem; margin-top: 4px;">Create movies with your toys!</p>
        </div>

        <!-- Camera Preview -->
        <div id="camera-container" style="
          width: 100%;
          max-width: 640px;
          aspect-ratio: 4/3;
          margin: var(--spacing-lg) auto;
          border-radius: var(--radius-lg);
          overflow: hidden;
          background: var(--color-surface);
          border: var(--glass-border);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        ">
          <p id="camera-placeholder" style="opacity: 0.4; font-size: 0.9rem;">Camera preview will appear here</p>
          <div id="recording-indicator" style="
            display: none;
            position: absolute;
            top: 12px;
            right: 12px;
            background: rgba(0,0,0,0.6);
            color: white;
            padding: 6px 12px;
            border-radius: var(--radius-full);
            font-size: 0.8rem;
            font-weight: 700;
            align-items: center;
            gap: 8px;
            z-index: 5;
          ">
            <div id="rec-dot" style="
              width: 10px;
              height: 10px;
              border-radius: 50%;
              background: #f44336;
            "></div>
            <span>REC</span>
          </div>
        </div>

        <!-- Camera error -->
        <p id="camera-error" style="
          text-align: center;
          color: var(--color-danger, #f44336);
          font-weight: 700;
          font-size: 0.9rem;
          display: none;
          margin-top: calc(-1 * var(--spacing-md));
          margin-bottom: var(--spacing-md);
        "></p>

        <!-- Character Gallery -->
        <div id="character-gallery" style="
          width: 100%;
          max-width: 640px;
          margin: 0 auto var(--spacing-md) auto;
          display: none;
        ">
          <h4 style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; color: var(--color-text-sub); margin-bottom: 8px;">Characters</h4>
          <div id="character-list" style="
            display: flex;
            gap: 12px;
            overflow-x: auto;
            padding: 4px 0;
          "></div>
        </div>

        <!-- Scene Timeline -->
        <div id="scene-timeline" style="
          width: 100%;
          max-width: 640px;
          margin: 0 auto var(--spacing-md) auto;
          display: none;
        ">
          <h4 style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; color: var(--color-text-sub); margin-bottom: 8px;">Scenes</h4>
          <div id="scene-list" style="
            display: flex;
            gap: 12px;
            overflow-x: auto;
            padding: 4px 0;
          "></div>
        </div>

        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: space-between; width: 100%; gap: 10px;">
          <!-- Model Visualizer -->
          <div style="width: 100%; height: 120px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <audio-visualizer id="model-viz"></audio-visualizer>
          </div>

          <!-- Transcript -->
          <div style="width: 100%; height: 250px; margin: 10px 0; position: relative;">
            <live-transcript></live-transcript>
          </div>

          <!-- User Visualizer -->
          <div style="width: 100%; height: 120px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <audio-visualizer id="user-viz"></audio-visualizer>
          </div>
        </div>

        <style>
          .story-cta-btn {
            background: var(--color-accent-primary);
            color: white;
            padding: 24px 48px;
            border-radius: var(--radius-lg);
            width: auto;
            min-width: 280px;
            border: 1px solid rgba(255,255,255,0.1);
            box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5),
                        0 0 0 1px rgba(255,255,255,0.2) inset;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 10;
            transition: all 0.4s cubic-bezier(0.19, 1, 0.22, 1);
            position: relative;
            overflow: hidden;
            font-family: var(--font-body);
          }

          .story-cta-btn:hover {
            transform: translateY(-5px) scale(1.02);
            filter: brightness(1.1);
            box-shadow: 0 20px 40px -10px rgba(163, 177, 138, 0.4),
                        0 0 0 2px rgba(255,255,255,0.3) inset;
          }

          .story-cta-btn:active {
            transform: translateY(-2px) scale(0.98);
          }

          .story-cta-btn::after {
            content: '';
            position: absolute;
            top: 0; left: 0; width: 200%; height: 100%;
            background: linear-gradient(115deg, transparent 0%, transparent 45%, rgba(255, 255, 255, 0.3) 50%, transparent 55%, transparent 100%);
            transform: translateX(-150%) skewX(-15deg);
            transition: transform 0.6s;
          }

          .story-cta-btn:hover::after {
            transform: translateX(150%) skewX(-15deg);
          }

          .story-cta-btn.active {
            background: var(--color-danger) !important;
            flex-direction: row !important;
            gap: 12px;
          }

          @keyframes rec-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        </style>

        <div style="margin-bottom: var(--spacing-xxl); display: flex; flex-direction: column; gap: var(--spacing-lg); align-items: center;">
          <button id="story-btn" class="story-cta-btn">
            <span style="font-size: 1.3rem; font-weight: 800; margin-bottom: 2px; letter-spacing: 0.02em;">Start Story</span>
            <span style="font-size: 0.85rem; opacity: 0.9; font-style: italic;">Create a movie with your toys!</span>
          </button>

          <p id="connection-status" style="
            margin-top: var(--spacing-sm);
            font-size: 0.9rem;
            font-weight: 700;
            height: 1.2em;
            transition: all 0.3s ease;
            letter-spacing: 0.05em;
            text-transform: uppercase;
          "></p>
        </div>
      </div>
    `;

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    const userViz = this.querySelector("#user-viz");
    const modelViz = this.querySelector("#model-viz");
    const storyBtn = this.querySelector("#story-btn");
    const statusEl = this.querySelector("#connection-status");
    const cameraContainer = this.querySelector("#camera-container");
    const cameraError = this.querySelector("#camera-error");
    let isActive = false;

    // Initialize Gemini Live
    this.client = new GeminiLiveAPI();
    this.audioStreamer = new AudioStreamer(this.client);
    this.audioPlayer = new AudioPlayer();
    this.videoStreamer = new VideoStreamer(this.client);

    // Define tool declarations
    const registerCharacterTool = new FunctionCallDefinition(
      "register_character",
      "Register a character for the movie. Call this when the kid shows a toy/character to the camera and tells you its name. This will capture a snapshot of the character from the camera.",
      {
        type: "OBJECT",
        properties: {
          name: {
            type: "STRING",
            description: "The name of the character as told by the kid",
          },
        },
        required: ["name"],
      },
      ["name"]
    );

    const startSceneTool = new FunctionCallDefinition(
      "start_scene_recording",
      "Start recording a scene. Call this when the kid says action, rolling, start, or indicates they want to begin recording a scene.",
      {
        type: "OBJECT",
        properties: {
          scene_number: {
            type: "INTEGER",
            description: "The scene number (1-based). Use the next sequential number, or a specific number if the kid is doing a retake.",
          },
          description: {
            type: "STRING",
            description: "Brief description of what happens in this scene",
          },
        },
        required: ["scene_number"],
      },
      ["scene_number"]
    );

    const stopSceneTool = new FunctionCallDefinition(
      "stop_scene_recording",
      "Stop recording the current scene. Call this when the kid says cut, stop, done, or indicates they want to end the current scene recording.",
      {
        type: "OBJECT",
        properties: {
          scene_number: {
            type: "INTEGER",
            description: "The scene number that was being recorded",
          },
        },
        required: ["scene_number"],
      },
      ["scene_number"]
    );

    const exportMovieTool = new FunctionCallDefinition(
      "export_movie",
      "Export and download the completed movie. Call this when the kid says they want to export, make their movie, download it, or are done with all scenes.",
      {
        type: "OBJECT",
        properties: {},
      },
      []
    );

    this.client.addFunction(registerCharacterTool);
    this.client.addFunction(startSceneTool);
    this.client.addFunction(stopSceneTool);
    this.client.addFunction(exportMovieTool);

    // Client callbacks
    this.client.onConnectionStarted = () => {
      console.log("[Story] Connection started");
    };

    this.client.onOpen = () => {
      console.log("[Story] WebSocket connection opened");
    };

    this.client.onReceiveResponse = (response) => {
      if (response.type === MultimodalLiveResponseType.AUDIO) {
        this.audioPlayer.play(response.data);
      } else if (response.type === MultimodalLiveResponseType.TURN_COMPLETE) {
        const transcriptEl = this.querySelector("live-transcript");
        if (transcriptEl) transcriptEl.finalizeAll();
      } else if (response.type === MultimodalLiveResponseType.TOOL_CALL) {
        console.log("[Story] Tool Call received:", response.data);
        if (response.data.functionCalls) {
          response.data.functionCalls.forEach((fc) => {
            this.handleToolCall(fc);
          });
        }
      } else if (response.type === MultimodalLiveResponseType.INPUT_TRANSCRIPTION) {
        const transcriptEl = this.querySelector("live-transcript");
        if (transcriptEl) {
          transcriptEl.addInputTranscript(response.data.text, response.data.finished);
        }
      } else if (response.type === MultimodalLiveResponseType.OUTPUT_TRANSCRIPTION) {
        const transcriptEl = this.querySelector("live-transcript");
        if (transcriptEl) {
          transcriptEl.addOutputTranscript(response.data.text, response.data.finished);
        }
      }
    };

    this.client.onError = (error) => {
      console.error("[Story] Error:", error);
    };

    this.client.onClose = () => {
      console.log("[Story] Connection closed");
    };

    // Back button
    this.querySelector("#back-to-missions").addEventListener("click", () => {
      this.cleanupSession(userViz, modelViz);
      this.dispatchEvent(
        new CustomEvent("navigate", {
          bubbles: true,
          detail: { view: "story" },
        })
      );
    });

    // Story button
    storyBtn.addEventListener("click", async () => {
      isActive = !isActive;

      if (isActive) {
        storyBtn.classList.add("active");
        storyBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
          <span style="font-weight: 800; font-size: 1.1rem; letter-spacing: 0.05em; text-transform: uppercase;">End Story</span>
        `;
      } else {
        storyBtn.classList.remove("active");
        this.cleanupSession(userViz, modelViz);
        this.dispatchEvent(
          new CustomEvent("navigate", {
            bubbles: true,
            detail: { view: "story" },
          })
        );
        return;
      }

      if (isActive) {
        console.log("[Story] Starting story session...");
        statusEl.textContent = "Connecting...";
        statusEl.style.color = "var(--color-text-sub)";
        cameraError.style.display = "none";

        try {
          const systemInstruction = `
ROLE:
You are an enthusiastic, fun kids' movie director assistant called "CineMachine". You help kids create movies using their toys and a camera.
You can see through the kid's camera in real-time.
Always speak in English.

PERSONALITY:
- Super enthusiastic and encouraging ("That's AMAZING!", "What a great character!")
- Patient with setup and retakes
- Use short, clear sentences appropriate for kids
- Celebrate every achievement (registering a character, finishing a scene)
- Be creative and help the kid develop their story ideas

SESSION FLOW:
1. GREET: Welcome the kid warmly. Ask what kind of movie they want to make today.
2. CHARACTERS: Ask the kid to introduce their characters one by one. When they show a toy and tell you its name, call register_character with that name. Confirm you can see the toy and describe it briefly.
3. STORY SETUP: Help the kid plan what happens in their movie. Suggest a simple structure (beginning, middle, end).
4. SCENE RECORDING: Guide scene recording. When the kid is ready:
   - They say "action" (or similar) -> call start_scene_recording with the next scene number
   - They say "cut" (or similar) -> call stop_scene_recording
   - Between scenes, encourage them and help set up the next scene
5. RETAKES: If the kid wants to redo a scene, use that scene_number again (it will overwrite).
6. EXPORT: When all scenes are done and the kid is happy, ask if they want to export. When they confirm, call export_movie.

TOOL USAGE RULES:
- register_character: Call when the kid shows a toy to camera and names it. Describe what you see to confirm.
- start_scene_recording: Call when kid says "action", "start", "rolling", "go", or similar.
- stop_scene_recording: Call when kid says "cut", "stop", "done", "end scene", or similar. Always use the current scene number.
- export_movie: Call when kid says "export", "make my movie", "download", "I'm done", or similar.
- NEVER call start_scene_recording if already recording. NEVER call stop_scene_recording if not recording.
- Always announce clearly before recording: "Scene [number]... ready? ACTION!" and after stopping: "Cut! Great scene!"

CAMERA AWARENESS:
- You can see through the camera. Describe what you see to engage the kid.
- If the frame is dark or unclear, let the kid know to adjust.
- During character registration, confirm you can see the toy clearly.
- During scene recording, occasionally comment on what's happening (but keep it brief so you don't talk over the kid's story).
`;

          this.client.setSystemInstructions(systemInstruction);
          this.client.setInputAudioTranscription(true);
          this.client.setOutputAudioTranscription(true);

          // Get reCAPTCHA token
          let token = "";
          try {
            token = await this.getRecaptchaToken();
          } catch (err) {
            console.error("Recaptcha failed:", err);
            this.resetSession(storyBtn, userViz, modelViz, statusEl);
            isActive = false;
            return;
          }

          // Connect
          await this.client.connect(token);

          // Start audio
          console.log("[Story] Starting audio stream...");
          await this.audioStreamer.start();

          if (this.audioStreamer.audioContext && this.audioStreamer.source) {
            userViz.connect(this.audioStreamer.audioContext, this.audioStreamer.source);
          }

          // Init audio player
          await this.audioPlayer.init();

          if (this.audioPlayer.audioContext && this.audioPlayer.gainNode) {
            modelViz.connect(this.audioPlayer.audioContext, this.audioPlayer.gainNode);
          }

          // Start camera
          console.log("[Story] Starting camera...");
          try {
            const videoEl = await this.videoStreamer.start({
              fps: 1,
              width: 768,
              height: 768,
              facingMode: "user",
              quality: 0.8,
            });

            const placeholder = cameraContainer.querySelector("#camera-placeholder");
            if (placeholder) placeholder.remove();

            videoEl.style.cssText = `
              width: 100%;
              height: 100%;
              object-fit: cover;
              transform: scaleX(-1);
              border-radius: var(--radius-lg);
            `;
            cameraContainer.appendChild(videoEl);
          } catch (camErr) {
            console.error("[Story] Camera error:", camErr);
            let errorMsg = "Camera error: " + camErr.message;
            if (camErr.name === "NotAllowedError") {
              errorMsg = "Camera permission denied. Please allow camera access and try again.";
            } else if (camErr.name === "NotFoundError") {
              errorMsg = "No camera found. Please connect a camera and try again.";
            }
            cameraError.textContent = errorMsg;
            cameraError.style.display = "block";

            if (this.audioStreamer) this.audioStreamer.stop();
            if (this.client) this.client.disconnect();
            if (this.audioPlayer) this.audioPlayer.interrupt();
            this.resetSession(storyBtn, userViz, modelViz, statusEl);
            isActive = false;
            return;
          }

          console.log("[Story] Session active!");
          statusEl.textContent = "Connected - let's make a movie!";
          statusEl.style.color = "#4CAF50";

          const startSound = new Audio("/start-bell.mp3");
          startSound.volume = 0.6;
          startSound.play().catch((e) => console.error("Failed to play start sound:", e));
        } catch (err) {
          console.error("[Story] Failed to start session:", err);
          this.resetSession(storyBtn, userViz, modelViz, statusEl);
          isActive = false;

          if (err.status === 429) {
            statusEl.textContent = "Too many requests. Try again later.";
            statusEl.style.color = "var(--color-danger, #f44336)";
          } else {
            statusEl.textContent = "Failed to connect: " + err.message;
            statusEl.style.color = "var(--color-danger, #f44336)";
          }
        }
      }
    });
  }

  // --- Tool Call Handler ---

  handleToolCall(fc) {
    console.log("[Story] Handling tool call:", fc.name, fc.args);
    switch (fc.name) {
      case "register_character":
        this.registerCharacter(fc.id, fc.args);
        break;
      case "start_scene_recording":
        this.startSceneRecording(fc.id, fc.args);
        break;
      case "stop_scene_recording":
        this.stopSceneRecording(fc.id, fc.args);
        break;
      case "export_movie":
        this.exportMovie(fc.id);
        break;
      default:
        console.warn("[Story] Unknown tool call:", fc.name);
    }
  }

  // --- register_character ---

  registerCharacter(callId, args) {
    try {
      const thumbnail = this.videoStreamer.takeSnapshot();
      const character = { name: args.name, thumbnail };
      this.characters.push(character);
      this.updateCharacterGallery();

      this.client.sendToolResponse(callId, {
        success: true,
        character_name: args.name,
        total_characters: this.characters.length,
      });
    } catch (err) {
      console.error("[Story] register_character error:", err);
      this.client.sendToolResponse(callId, {
        success: false,
        error: err.message,
      });
    }
  }

  // --- start_scene_recording ---

  startSceneRecording(callId, args) {
    try {
      if (this.isRecording) {
        this.client.sendToolResponse(callId, {
          success: false,
          error: "Already recording a scene",
        });
        return;
      }

      // Combine video + audio tracks into one MediaStream for recording
      const videoTracks = this.videoStreamer.mediaStream
        ? this.videoStreamer.mediaStream.getVideoTracks()
        : [];
      const audioTracks = this.audioStreamer.mediaStream
        ? this.audioStreamer.mediaStream.getAudioTracks()
        : [];

      const combinedStream = new MediaStream([...videoTracks, ...audioTracks]);

      this.recordedChunks = [];

      // Choose best available codec
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
          ? "video/webm;codecs=vp8,opus"
          : "video/webm";

      this.mediaRecorder = new MediaRecorder(combinedStream, { mimeType });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.recordedChunks.push(e.data);
      };

      this.currentScene = {
        number: args.scene_number,
        description: args.description || "",
        startTime: Date.now(),
      };

      this.isRecording = true;
      this.mediaRecorder.start(1000);
      this.updateRecordingIndicator(true);

      this.client.sendToolResponse(callId, {
        success: true,
        scene_number: args.scene_number,
        recording: true,
      });
    } catch (err) {
      console.error("[Story] start_scene_recording error:", err);
      this.client.sendToolResponse(callId, {
        success: false,
        error: err.message,
      });
    }
  }

  // --- stop_scene_recording ---

  stopSceneRecording(callId, args) {
    if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
      this.client.sendToolResponse(callId, {
        success: false,
        error: "Not currently recording",
      });
      return;
    }

    const sceneNumber = args.scene_number;
    const startTime = this.currentScene ? this.currentScene.startTime : Date.now();

    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this.recordedChunks, { type: "video/webm" });
      const duration = (Date.now() - startTime) / 1000;

      let thumbnail = null;
      try {
        thumbnail = this.videoStreamer.takeSnapshot();
      } catch (e) {
        console.warn("[Story] Could not capture scene thumbnail:", e);
      }

      const scene = {
        number: sceneNumber,
        blob,
        duration,
        thumbnail,
        description: this.currentScene ? this.currentScene.description : "",
      };

      // Overwrite if scene number already exists (retake)
      const existingIndex = this.scenes.findIndex((s) => s.number === sceneNumber);
      if (existingIndex >= 0) {
        this.scenes[existingIndex] = scene;
      } else {
        this.scenes.push(scene);
      }

      this.isRecording = false;
      this.currentScene = null;
      this.recordedChunks = [];
      this.updateRecordingIndicator(false);
      this.updateSceneTimeline();

      this.client.sendToolResponse(callId, {
        success: true,
        scene_number: sceneNumber,
        duration_seconds: Math.round(duration * 10) / 10,
      });
    };

    this.mediaRecorder.stop();
  }

  // --- export_movie ---

  exportMovie(callId) {
    if (this.scenes.length === 0) {
      this.client.sendToolResponse(callId, {
        success: false,
        error: "No scenes recorded yet",
      });
      return;
    }

    const sortedScenes = [...this.scenes].sort((a, b) => a.number - b.number);
    const blobs = sortedScenes.map((s) => s.blob);
    const combined = new Blob(blobs, { type: "video/webm" });

    const url = URL.createObjectURL(combined);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-movie.webm";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(url), 5000);

    this.client.sendToolResponse(callId, {
      success: true,
      total_scenes: sortedScenes.length,
      download_started: true,
    });
  }

  // --- UI Update Methods ---

  updateCharacterGallery() {
    const gallery = this.querySelector("#character-gallery");
    const list = this.querySelector("#character-list");
    if (!gallery || !list) return;

    gallery.style.display = "block";
    list.innerHTML = "";

    this.characters.forEach((char) => {
      const item = document.createElement("div");
      item.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
      `;
      item.innerHTML = `
        <div style="
          width: 64px;
          height: 64px;
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 2px solid var(--color-accent-primary);
          box-shadow: var(--shadow-sm);
        ">
          <img src="${char.thumbnail}" style="width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1);" />
        </div>
        <span style="font-size: 0.75rem; font-weight: 700; color: var(--color-text-main); max-width: 70px; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${char.name}</span>
      `;
      list.appendChild(item);
    });
  }

  updateSceneTimeline() {
    const timeline = this.querySelector("#scene-timeline");
    const list = this.querySelector("#scene-list");
    if (!timeline || !list) return;

    timeline.style.display = "block";
    list.innerHTML = "";

    const sortedScenes = [...this.scenes].sort((a, b) => a.number - b.number);

    sortedScenes.forEach((scene) => {
      const item = document.createElement("div");
      item.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
      `;
      item.innerHTML = `
        <div style="
          width: 80px;
          height: 60px;
          border-radius: var(--radius-sm);
          overflow: hidden;
          border: 2px solid var(--color-accent-secondary);
          box-shadow: var(--shadow-sm);
          position: relative;
          background: var(--color-surface);
        ">
          ${scene.thumbnail ? `<img src="${scene.thumbnail}" style="width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1);" />` : ""}
          <div style="
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(0,0,0,0.6);
            color: white;
            font-size: 0.6rem;
            padding: 2px 4px;
            text-align: center;
          ">${Math.round(scene.duration)}s</div>
        </div>
        <span style="font-size: 0.7rem; font-weight: 700; color: var(--color-text-sub);">Scene ${scene.number}</span>
      `;
      list.appendChild(item);
    });
  }

  updateRecordingIndicator(show) {
    const indicator = this.querySelector("#recording-indicator");
    if (!indicator) return;

    if (show) {
      indicator.style.display = "flex";
      const dot = indicator.querySelector("#rec-dot");
      if (dot) dot.style.animation = "rec-pulse 1s infinite";
    } else {
      indicator.style.display = "none";
    }
  }

  // --- Session Management ---

  cleanupSession(userViz, modelViz) {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
    if (this.videoStreamer) this.videoStreamer.stop();
    if (this.audioStreamer) this.audioStreamer.stop();
    if (this.client) this.client.disconnect();
    if (this.audioPlayer) this.audioPlayer.interrupt();
    if (userViz && userViz.disconnect) userViz.disconnect();
    if (modelViz && modelViz.disconnect) modelViz.disconnect();
  }

  resetSession(btn, userViz, modelViz, statusEl) {
    btn.classList.remove("active");
    btn.innerHTML = `
      <span style="font-size: 1.3rem; font-weight: 800; margin-bottom: 2px; letter-spacing: 0.02em;">Start Story</span>
      <span style="font-size: 0.85rem; opacity: 0.9; font-style: italic;">Create a movie with your toys!</span>
    `;
    if (userViz && userViz.disconnect) userViz.disconnect();
    if (modelViz && modelViz.disconnect) modelViz.disconnect();
    statusEl.textContent = "";
  }

  async getRecaptchaToken() {
    return new Promise((resolve) => {
      if (typeof grecaptcha === "undefined") {
        console.warn("[Story] ReCAPTCHA not loaded (Simple Mode). Proceeding without token.");
        resolve(null);
        return;
      }

      try {
        grecaptcha.enterprise.ready(async () => {
          try {
            const t = await grecaptcha.enterprise.execute(
              "6LeSYx8sAAAAAGdRAp8VQ2K9I-KYGWBykzayvQ8n",
              { action: "LOGIN" }
            );
            resolve(t);
          } catch (e) {
            console.warn("[Story] ReCAPTCHA execution failed:", e);
            resolve(null);
          }
        });
      } catch (e) {
        console.warn("[Story] ReCAPTCHA ready failed:", e);
        resolve(null);
      }
    });
  }
}

customElements.define("view-story-mode", ViewStoryMode);
