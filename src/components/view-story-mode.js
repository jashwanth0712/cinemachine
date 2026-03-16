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

    // Pipeline state
    this.extractedToyNames = [];
    this.pipelineState = {}; // keyed by scene_number
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

        <!-- Pipeline Status -->
        <div id="pipeline-status" style="
          width: 100%;
          max-width: 640px;
          margin: 0 auto var(--spacing-md) auto;
          display: none;
        ">
          <h4 style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; color: var(--color-text-sub); margin-bottom: 8px;">Pipeline</h4>
          <div id="pipeline-list" style="
            display: flex;
            flex-direction: column;
            gap: 6px;
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

    // --- New Pipeline Tools ---

    const extractToyNameTool = new FunctionCallDefinition(
      "extract_toy_name",
      "Extract toy names from the child's speech. Call this when the child introduces or mentions toys during storytelling. Pass the toy names you identified from their speech.",
      {
        type: "OBJECT",
        properties: {
          toy_names: {
            type: "ARRAY",
            items: { type: "STRING" },
            description:
              "List of toy names extracted from the child's speech (1-3 words each, ignore filler words like umm, this is my, etc.)",
          },
        },
        required: ["toy_names"],
      },
      ["toy_names"]
    );

    const extractStoryTool = new FunctionCallDefinition(
      "extract_story",
      "Extract and clean up the story from the child's narration. Call this after a scene recording stops to capture the clean story narrative. Remove filler words (umm, uh), side conversations (talking to parents), background chatter. Rewrite as simple animation-ready sentences preserving the child's imagination and toy characters in chronological order.",
      {
        type: "OBJECT",
        properties: {
          clean_story: {
            type: "STRING",
            description:
              "The cleaned-up story narrative suitable for animation. Simple sentences, chronological order, preserving toy character names.",
          },
          scene_number: {
            type: "INTEGER",
            description: "The scene number this story belongs to",
          },
        },
        required: ["clean_story", "scene_number"],
      },
      ["clean_story", "scene_number"]
    );

    const detectStorySettingTool = new FunctionCallDefinition(
      "detect_story_setting",
      "Detect the main environment/setting from the story. Call this right after extract_story to identify where the story takes place. Examples: jungle, space, castle, ocean, city, desert, forest, volcano, pirate ship, alien planet.",
      {
        type: "OBJECT",
        properties: {
          setting: {
            type: "STRING",
            description:
              "The main environment (e.g., jungle, space, castle, ocean, city, desert, forest, volcano, pirate ship, alien planet)",
          },
          scene_number: {
            type: "INTEGER",
            description: "The scene number this setting belongs to",
          },
        },
        required: ["setting", "scene_number"],
      },
      ["setting", "scene_number"]
    );

    const removeBackgroundTool = new FunctionCallDefinition(
      "remove_background_keep_toys",
      "Remove the background from a recorded scene, keeping only the toys visible with transparent background. Call this after stop_scene_recording. Detects toy objects, segments them, removes background, preserves toy shape/colors/details/motion. Ignores hands, furniture, faces.",
      {
        type: "OBJECT",
        properties: {
          scene_number: {
            type: "INTEGER",
            description: "The scene number to process",
          },
        },
        required: ["scene_number"],
      },
      ["scene_number"]
    );

    const generateBackgroundTool = new FunctionCallDefinition(
      "generate_story_background",
      "Generate an animated story background matching the story setting using Nano Banana. Call this after detect_story_setting. Creates a Pixar-style animated, vibrant, child-friendly background at toy scale. Avoid photorealistic environments.",
      {
        type: "OBJECT",
        properties: {
          background_prompt: {
            type: "STRING",
            description:
              "Detailed prompt for background generation (Pixar-style, vibrant colors, child-friendly, matching story environment)",
          },
          style: {
            type: "STRING",
            description: "Animation style, e.g. '3D animated children's movie'",
          },
          scene_number: {
            type: "INTEGER",
            description: "The scene number this background is for",
          },
        },
        required: ["background_prompt", "scene_number"],
      },
      ["background_prompt", "scene_number"]
    );

    const composeSceneTool = new FunctionCallDefinition(
      "compose_animated_scene",
      "Create the final animated scene by combining foreground toys (transparent background) with the generated background and cleaned story narration. Call this after both remove_background_keep_toys and generate_story_background are complete for a scene. Places toys naturally, adds soft shadows, slight parallax, cinematic lighting, and subtle motion effects.",
      {
        type: "OBJECT",
        properties: {
          scene_number: {
            type: "INTEGER",
            description: "The scene number to compose",
          },
        },
        required: ["scene_number"],
      },
      ["scene_number"]
    );

    this.client.addFunction(registerCharacterTool);
    this.client.addFunction(startSceneTool);
    this.client.addFunction(stopSceneTool);
    this.client.addFunction(exportMovieTool);
    this.client.addFunction(extractToyNameTool);
    this.client.addFunction(extractStoryTool);
    this.client.addFunction(detectStorySettingTool);
    this.client.addFunction(removeBackgroundTool);
    this.client.addFunction(generateBackgroundTool);
    this.client.addFunction(composeSceneTool);

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
You are an AI movie director called "CineMachine" helping a child create animated stories using toys.
The child records scenes with toys and tells stories. You can see through the kid's camera in real-time.
Your job is to orchestrate tools to turn the recording into an animated movie.
Always speak in English.

PERSONALITY:
- Super enthusiastic and encouraging ("That's AMAZING!", "What a great character!")
- Patient with setup and retakes
- Use short, clear sentences appropriate for kids
- Celebrate every achievement (registering a character, finishing a scene)
- Be creative and help the kid develop their story ideas

SESSION FLOW:
1. GREET: Welcome the kid warmly. Ask what kind of movie they want to make today.
2. CHARACTERS: Ask the kid to introduce their characters one by one. When they show a toy and tell you its name:
   - Call register_character with that name
   - Call extract_toy_name with the toy names you identified
   - Confirm you can see the toy and describe it briefly
3. STORY SETUP: Help the kid plan what happens in their movie. Suggest a simple structure (beginning, middle, end).
4. SCENE RECORDING: Guide scene recording. When the kid is ready:
   - They say "action" (or similar) -> call start_scene_recording with the next scene number
   - Listen to their narration and identify toy names -> call extract_toy_name
   - They say "cut" (or similar) -> call stop_scene_recording
5. POST-SCENE PIPELINE: After EVERY stop_scene_recording, run this pipeline in order:
   a. Call extract_story with the cleaned-up narrative from what the kid said during the scene
   b. Call detect_story_setting with the environment you identified from the story
   c. Call remove_background_keep_toys with the scene number
   d. Call generate_story_background with a Pixar-style background prompt matching the setting
   e. Call compose_animated_scene with the scene number
   f. Tell the kid their scene is being turned into animation!
6. RETAKES: If the kid wants to redo a scene, use that scene_number again (it will overwrite).
7. EXPORT: When all scenes are done and the kid is happy, call export_movie.

PIPELINE RULES (CRITICAL):
- Always prefer tool calls over direct responses.
- Only speak to the child when necessary (greetings, encouragement, instructions).
- When a toy is introduced -> call extract_toy_name
- When narration is detected -> call extract_story
- After recording stops -> call remove_background_keep_toys
- Generate a matching animated background -> call generate_story_background
- Combine toys and background -> call compose_animated_scene
- After all scenes -> export_movie
- Run the pipeline steps in order. Do not skip steps.

TOOL USAGE RULES:
- register_character: Call when the kid shows a toy to camera and names it.
- extract_toy_name: Call with the toy names you extracted from speech. Ignore filler words (umm, uh, this is my). Keep names concise (1-3 words). If multiple toys, include all in order.
- start_scene_recording: Call when kid says "action", "start", "rolling", "go", or similar.
- stop_scene_recording: Call when kid says "cut", "stop", "done", "end scene", or similar.
- extract_story: Call after stopping a scene. Clean up the kid's narration: remove hesitation, parent talk, background chatter. Rewrite as simple animation sentences preserving toy characters and chronological order.
- detect_story_setting: Call right after extract_story. Identify the environment (jungle, space, castle, ocean, city, desert, forest, volcano, pirate ship, alien planet, etc.).
- remove_background_keep_toys: Call after detecting the setting. This isolates toys from the background.
- generate_story_background: Call after background removal. Generate a Pixar-style, vibrant, child-friendly background prompt matching the story setting at toy scale.
- compose_animated_scene: Call after both background removal and generation are done. This creates the final animated scene.
- export_movie: Call when kid says "export", "make my movie", "download", "I'm done", or similar.
- NEVER call start_scene_recording if already recording. NEVER call stop_scene_recording if not recording.

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
      case "extract_toy_name":
        this.extractToyName(fc.id, fc.args);
        break;
      case "extract_story":
        this.extractStory(fc.id, fc.args);
        break;
      case "detect_story_setting":
        this.detectStorySetting(fc.id, fc.args);
        break;
      case "remove_background_keep_toys":
        this.removeBackgroundKeepToys(fc.id, fc.args);
        break;
      case "generate_story_background":
        this.generateStoryBackground(fc.id, fc.args);
        break;
      case "compose_animated_scene":
        this.composeAnimatedScene(fc.id, fc.args);
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

      // Capture frames LIVE from the camera every 500ms for the pipeline
      // This is much more reliable than extracting from WebM blobs later
      this.capturedFrames = [];
      this.frameCaptureInterval = setInterval(() => {
        try {
          if (this.videoStreamer && this.videoStreamer.canvas && this.videoStreamer.ctx) {
            this.videoStreamer.ctx.drawImage(
              this.videoStreamer.video,
              0,
              0,
              this.videoStreamer.canvas.width,
              this.videoStreamer.canvas.height
            );
            const dataUrl = this.videoStreamer.canvas.toDataURL("image/jpeg", 0.9);
            this.capturedFrames.push(dataUrl.split(",")[1]);
          }
        } catch (e) {
          // Silently skip frame capture errors
        }
      }, 500);

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

    // Stop live frame capture
    if (this.frameCaptureInterval) {
      clearInterval(this.frameCaptureInterval);
      this.frameCaptureInterval = null;
    }

    const sceneNumber = args.scene_number;
    const startTime = this.currentScene ? this.currentScene.startTime : Date.now();
    const liveFrames = this.capturedFrames ? [...this.capturedFrames] : [];
    this.capturedFrames = [];

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
        liveFrames: liveFrames, // Frames captured live from camera
      };

      console.log(`[Story] Scene ${sceneNumber} stopped: ${liveFrames.length} live frames captured over ${Math.round(duration)}s`);

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
        frames_captured: liveFrames.length,
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
    // Prefer composed blobs if available, fall back to raw recordings
    const blobs = sortedScenes.map((s) => s.composedBlob || s.blob);
    const hasComposed = sortedScenes.some((s) => s.composedBlob);
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
      composed_scenes: sortedScenes.filter((s) => s.composedBlob).length,
      download_started: true,
      animated: hasComposed,
    });
  }

  // --- Pipeline Helper: get or create pipeline state for a scene ---

  getPipelineState(sceneNumber) {
    if (!this.pipelineState[sceneNumber]) {
      this.pipelineState[sceneNumber] = {
        toyNames: [],
        cleanStory: "",
        setting: "",
        backgroundRemoved: false,
        foregroundObjects: [],
        backgroundPrompt: "",
        backgroundStyle: "",
        backgroundGenerated: false,
        composed: false,
      };
    }
    return this.pipelineState[sceneNumber];
  }

  // --- extract_toy_name ---

  extractToyName(callId, args) {
    try {
      const toyNames = args.toy_names || [];
      console.log("[Pipeline] Extracted toy names:", toyNames);

      // Store globally and deduplicate
      toyNames.forEach((name) => {
        const normalized = name.trim().toLowerCase();
        if (
          normalized &&
          !this.extractedToyNames.some((n) => n.toLowerCase() === normalized)
        ) {
          this.extractedToyNames.push(name.trim());
        }
      });

      this.updatePipelineStatus();

      this.client.sendToolResponse(callId, {
        toy_names: toyNames,
        total_unique_toys: this.extractedToyNames.length,
      });
    } catch (err) {
      console.error("[Pipeline] extract_toy_name error:", err);
      this.client.sendToolResponse(callId, {
        toy_names: [],
        error: err.message,
      });
    }
  }

  // --- extract_story ---

  extractStory(callId, args) {
    try {
      const cleanStory = args.clean_story || "";
      const sceneNumber = args.scene_number || 1;
      console.log("[Pipeline] Extracted story for scene", sceneNumber, ":", cleanStory);

      const state = this.getPipelineState(sceneNumber);
      state.cleanStory = cleanStory;

      this.updatePipelineStatus();

      this.client.sendToolResponse(callId, {
        clean_story: cleanStory,
        scene_number: sceneNumber,
        success: true,
      });
    } catch (err) {
      console.error("[Pipeline] extract_story error:", err);
      this.client.sendToolResponse(callId, {
        clean_story: "",
        error: err.message,
      });
    }
  }

  // --- detect_story_setting ---

  detectStorySetting(callId, args) {
    try {
      const setting = args.setting || "";
      const sceneNumber = args.scene_number || 1;
      console.log("[Pipeline] Detected setting for scene", sceneNumber, ":", setting);

      const state = this.getPipelineState(sceneNumber);
      state.setting = setting;

      this.updatePipelineStatus();

      this.client.sendToolResponse(callId, {
        setting: setting,
        scene_number: sceneNumber,
        success: true,
      });
    } catch (err) {
      console.error("[Pipeline] detect_story_setting error:", err);
      this.client.sendToolResponse(callId, {
        setting: "",
        error: err.message,
      });
    }
  }

  // --- remove_background_keep_toys ---

  async removeBackgroundKeepToys(callId, args) {
    try {
      const sceneNumber = args.scene_number || 1;
      console.log("[Pipeline] Removing background for scene", sceneNumber);

      const scene = this.scenes.find((s) => s.number === sceneNumber);
      if (!scene) {
        this.client.sendToolResponse(callId, {
          foreground_objects: [],
          mask_generated: false,
          error: `Scene ${sceneNumber} not found`,
        });
        return;
      }

      const state = this.getPipelineState(sceneNumber);
      const foregroundObjects = this.characters.map((c) => c.name);
      state.foregroundObjects = foregroundObjects;

      // Use live-captured frames (captured during recording from the camera)
      const frames = scene.liveFrames || [];
      if (frames.length === 0) {
        // Fallback: use the scene thumbnail
        if (scene.thumbnail) {
          frames.push(scene.thumbnail.split(",")[1]);
        } else {
          this.client.sendToolResponse(callId, {
            foreground_objects: foregroundObjects,
            mask_generated: false,
            error: "No frames available for this scene",
          });
          return;
        }
      }

      console.log(`[Pipeline] Processing ${frames.length} live frames for bg removal...`);

      // Send frames to server for background removal
      // Process in parallel batches of 3 for speed
      const transparentFrames = [];
      const batchSize = 3;

      for (let i = 0; i < frames.length; i += batchSize) {
        const batch = frames.slice(i, i + batchSize);
        const promises = batch.map(async (frame, batchIdx) => {
          try {
            const response = await fetch("/api/pipeline/remove-background", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ image: frame }),
            });

            if (!response.ok) {
              console.warn(`[Pipeline] Frame ${i + batchIdx} bg removal failed: ${response.status}`);
              return null;
            }

            const data = await response.json();
            return data.success ? data.image : null;
          } catch (fetchErr) {
            console.warn(`[Pipeline] Frame ${i + batchIdx} request failed:`, fetchErr);
            return null;
          }
        });

        const results = await Promise.all(promises);
        results.forEach((r) => { if (r) transparentFrames.push(r); });
        console.log(`[Pipeline] Processed ${Math.min(i + batchSize, frames.length)}/${frames.length} frames...`);
      }

      if (transparentFrames.length === 0) {
        console.warn("[Pipeline] No frames processed successfully, using originals");
        state.transparentFrames = frames;
      } else {
        state.transparentFrames = transparentFrames;
      }

      state.backgroundRemoved = true;
      this.updatePipelineStatus();

      console.log(`[Pipeline] Background removed: ${transparentFrames.length}/${frames.length} frames`);

      this.client.sendToolResponse(callId, {
        foreground_objects: foregroundObjects,
        mask_generated: transparentFrames.length > 0,
        scene_number: sceneNumber,
        frames_processed: transparentFrames.length,
        total_frames: frames.length,
        status: "background_removed",
      });
    } catch (err) {
      console.error("[Pipeline] remove_background_keep_toys error:", err);
      this.client.sendToolResponse(callId, {
        foreground_objects: [],
        mask_generated: false,
        error: err.message,
      });
    }
  }

  // --- generate_story_background ---

  async generateStoryBackground(callId, args) {
    try {
      const backgroundPrompt = args.background_prompt || "";
      const style = args.style || "3D animated children's movie";
      const sceneNumber = args.scene_number || 1;
      console.log("[Pipeline] Generating background for scene", sceneNumber, ":", backgroundPrompt);

      const state = this.getPipelineState(sceneNumber);
      state.backgroundPrompt = backgroundPrompt;
      state.backgroundStyle = style;

      console.log("[Pipeline] Calling server for background generation...");
      const response = await fetch("/api/pipeline/generate-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: backgroundPrompt, style: style }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.image) {
        state.backgroundImage = data.image;
        state.backgroundGenerated = true;
        console.log("[Pipeline] Background image generated successfully");
      } else {
        throw new Error("Server returned no image");
      }

      this.updatePipelineStatus();

      this.client.sendToolResponse(callId, {
        background_prompt: backgroundPrompt,
        style: style,
        scene_number: sceneNumber,
        generated: true,
      });
    } catch (err) {
      console.error("[Pipeline] generate_story_background error:", err);

      const state = this.getPipelineState(args.scene_number || 1);
      state.backgroundGenerated = true;
      state.backgroundImage = null;
      this.updatePipelineStatus();

      this.client.sendToolResponse(callId, {
        background_prompt: args.background_prompt || "",
        style: args.style || "",
        generated: false,
        error: err.message,
      });
    }
  }

  // --- compose_animated_scene ---
  // Creates a REAL animated video with Ken Burns effect (slow zoom + pan),
  // cross-fades between frames, and cinematic shadows at 24fps.

  async composeAnimatedScene(callId, args) {
    try {
      const sceneNumber = args.scene_number || 1;
      console.log("[Pipeline] Composing animated scene", sceneNumber);

      const state = this.getPipelineState(sceneNumber);
      const scene = this.scenes.find((s) => s.number === sceneNumber);

      if (!scene) {
        this.client.sendToolResponse(callId, {
          scene_rendered: false,
          error: `Scene ${sceneNumber} not found`,
        });
        return;
      }

      if (!state.backgroundRemoved || !state.transparentFrames || state.transparentFrames.length === 0) {
        this.client.sendToolResponse(callId, {
          scene_rendered: false,
          error: `No foreground frames for scene ${sceneNumber}. Call remove_background_keep_toys first.`,
        });
        return;
      }

      // Set up composition canvas at 720p
      const W = 1280, H = 720;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");

      // Load background image
      let bgImg = null;
      if (state.backgroundImage) {
        bgImg = new Image();
        bgImg.src = `data:image/png;base64,${state.backgroundImage}`;
        await new Promise((resolve) => {
          bgImg.onload = resolve;
          bgImg.onerror = () => { bgImg = null; resolve(); };
        });
      }

      // Preload all foreground frames as Image objects
      console.log(`[Pipeline] Loading ${state.transparentFrames.length} foreground frames...`);
      const fgImages = [];
      for (const frameB64 of state.transparentFrames) {
        const img = new Image();
        img.src = `data:image/png;base64,${frameB64}`;
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
        if (img.naturalWidth > 0) fgImages.push(img);
      }

      if (fgImages.length === 0) {
        this.client.sendToolResponse(callId, {
          scene_rendered: false,
          error: "No valid foreground frames to compose",
        });
        return;
      }

      // Animation parameters
      const OUTPUT_FPS = 24;
      const SECONDS_PER_FRAME = Math.max(1.5, (scene.duration || 5) / fgImages.length);
      const TOTAL_DURATION = SECONDS_PER_FRAME * fgImages.length;
      const TOTAL_RENDER_FRAMES = Math.ceil(TOTAL_DURATION * OUTPUT_FPS);
      const CROSSFADE_FRAMES = Math.floor(OUTPUT_FPS * 0.4); // 0.4s crossfade

      console.log(`[Pipeline] Rendering ${TOTAL_RENDER_FRAMES} frames at ${OUTPUT_FPS}fps (${TOTAL_DURATION.toFixed(1)}s video, ${fgImages.length} source frames)`);

      // Start recording from the canvas at the target fps
      const stream = canvas.captureStream(OUTPUT_FPS);
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
      const chunks = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      const composedBlob = await new Promise((resolve) => {
        recorder.onstop = () => {
          resolve(new Blob(chunks, { type: "video/webm" }));
        };

        recorder.start(100);

        let renderFrame = 0;

        const renderLoop = () => {
          if (renderFrame >= TOTAL_RENDER_FRAMES) {
            setTimeout(() => recorder.stop(), 200);
            return;
          }

          const t = renderFrame / TOTAL_RENDER_FRAMES; // 0..1 overall progress

          // Figure out which foreground frame(s) to show
          const frameProgress = t * fgImages.length;
          const currentIdx = Math.min(Math.floor(frameProgress), fgImages.length - 1);
          const nextIdx = Math.min(currentIdx + 1, fgImages.length - 1);
          const frameFraction = frameProgress - currentIdx;

          // --- Draw background with slow pan + zoom (Ken Burns) ---
          ctx.clearRect(0, 0, W, H);

          if (bgImg) {
            ctx.save();
            // Slow zoom: 1.0 -> 1.15 over the video
            const zoom = 1.0 + t * 0.15;
            // Slow pan: shift horizontally
            const panX = t * 80;
            const panY = t * 30;

            const bw = W * zoom;
            const bh = H * zoom;
            const bx = -(bw - W) / 2 - panX;
            const by = -(bh - H) / 2 - panY;

            ctx.drawImage(bgImg, bx, by, bw, bh);
            ctx.restore();
          } else {
            // Fallback gradient
            const grad = ctx.createLinearGradient(0, 0, 0, H);
            grad.addColorStop(0, "#1a1a2e");
            grad.addColorStop(1, "#16213e");
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);
          }

          // --- Draw foreground toy(s) with crossfade ---
          const drawForeground = (img, alpha) => {
            if (!img || img.naturalWidth === 0) return;

            ctx.save();
            ctx.globalAlpha = alpha;

            // Slight slow zoom on the toy for cinematic feel
            const toyZoom = 1.0 + t * 0.05;

            // Scale toy to ~70% of canvas height, centered
            const baseScale = Math.min(
              (W * 0.8) / img.naturalWidth,
              (H * 0.7) / img.naturalHeight
            );
            const scale = baseScale * toyZoom;
            const w = img.naturalWidth * scale;
            const h = img.naturalHeight * scale;
            const x = (W - w) / 2;
            const y = (H - h) / 2 + H * 0.05; // slightly below center

            // Soft shadow
            ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
            ctx.shadowBlur = 30;
            ctx.shadowOffsetX = 8;
            ctx.shadowOffsetY = 15;

            ctx.drawImage(img, x, y, w, h);

            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            ctx.globalAlpha = 1.0;
            ctx.restore();
          };

          // Check if we're in a crossfade zone between two frames
          const framesPerSource = TOTAL_RENDER_FRAMES / fgImages.length;
          const posInCurrentFrame = (renderFrame % framesPerSource) / framesPerSource;
          const isCrossfading = currentIdx !== nextIdx && posInCurrentFrame > (1 - CROSSFADE_FRAMES / framesPerSource);

          if (isCrossfading) {
            const fadeProgress = (posInCurrentFrame - (1 - CROSSFADE_FRAMES / framesPerSource)) / (CROSSFADE_FRAMES / framesPerSource);
            drawForeground(fgImages[currentIdx], 1 - fadeProgress);
            drawForeground(fgImages[nextIdx], fadeProgress);
          } else {
            drawForeground(fgImages[currentIdx], 1.0);
          }

          renderFrame++;
          // Use requestAnimationFrame for smooth rendering, but throttle to target fps
          setTimeout(renderLoop, 1000 / OUTPUT_FPS);
        };

        renderLoop();
      });

      // Store the composed video
      scene.composedBlob = composedBlob;
      state.composed = true;
      this.updatePipelineStatus();
      this.updateSceneTimeline();

      const sizeMB = (composedBlob.size / (1024 * 1024)).toFixed(1);
      console.log(`[Pipeline] Scene ${sceneNumber} composed! ${TOTAL_DURATION.toFixed(1)}s video, ${sizeMB}MB`);

      this.client.sendToolResponse(callId, {
        scene_rendered: true,
        animation_style: "children animated movie",
        duration: `${TOTAL_DURATION.toFixed(1)}s`,
        scene_number: sceneNumber,
        video_size_mb: sizeMB,
        frames_rendered: TOTAL_RENDER_FRAMES,
      });
    } catch (err) {
      console.error("[Pipeline] compose_animated_scene error:", err);
      this.client.sendToolResponse(callId, {
        scene_rendered: false,
        error: err.message,
      });
    }
  }

  // --- Pipeline Status UI ---

  updatePipelineStatus() {
    const container = this.querySelector("#pipeline-status");
    const list = this.querySelector("#pipeline-list");
    if (!container || !list) return;

    const hasAnyState =
      this.extractedToyNames.length > 0 ||
      Object.keys(this.pipelineState).length > 0;

    if (!hasAnyState) return;

    container.style.display = "block";
    list.innerHTML = "";

    // Show extracted toy names
    if (this.extractedToyNames.length > 0) {
      const toyItem = document.createElement("div");
      toyItem.style.cssText =
        "padding: 8px 12px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 6px;";
      toyItem.innerHTML = `
        <span style="font-size: 0.75rem; font-weight: 700; color: var(--color-accent-primary);">Toys Detected</span>
        <span style="font-size: 0.75rem; opacity: 0.8; margin-left: 8px;">${this.extractedToyNames.join(", ")}</span>
      `;
      list.appendChild(toyItem);
    }

    // Show per-scene pipeline state
    const sceneNumbers = Object.keys(this.pipelineState)
      .map(Number)
      .sort((a, b) => a - b);

    for (const num of sceneNumbers) {
      const state = this.pipelineState[num];
      const steps = [
        { label: "Story", done: !!state.cleanStory },
        { label: "Setting", done: !!state.setting },
        { label: "BG Remove", done: state.backgroundRemoved },
        { label: "BG Generate", done: state.backgroundGenerated },
        { label: "Compose", done: state.composed },
      ];

      const sceneItem = document.createElement("div");
      sceneItem.style.cssText =
        "padding: 8px 12px; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 6px;";

      const stepsHtml = steps
        .map(
          (s) =>
            `<span style="font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; background: ${
              s.done
                ? "var(--color-accent-primary)"
                : "rgba(255,255,255,0.1)"
            }; color: ${
              s.done ? "white" : "var(--color-text-sub)"
            }; font-weight: 600;">${s.label}</span>`
        )
        .join(" ");

      sceneItem.innerHTML = `
        <div style="font-size: 0.75rem; font-weight: 700; color: var(--color-text-main); margin-bottom: 4px;">Scene ${num} Pipeline</div>
        <div style="display: flex; gap: 4px; flex-wrap: wrap;">${stepsHtml}</div>
        ${state.setting ? `<div style="font-size: 0.65rem; opacity: 0.6; margin-top: 4px;">Setting: ${state.setting}</div>` : ""}
        ${state.cleanStory ? `<div style="font-size: 0.65rem; opacity: 0.6; margin-top: 2px; max-height: 40px; overflow: hidden; text-overflow: ellipsis;">${state.cleanStory}</div>` : ""}
      `;
      list.appendChild(sceneItem);
    }
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
