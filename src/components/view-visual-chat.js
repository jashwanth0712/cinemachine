import "./audio-visualizer.js";
import "./live-transcript.js";
import {
  GeminiLiveAPI,
  MultimodalLiveResponseType,
} from "../lib/gemini-live/geminilive.js";
import {
  AudioStreamer,
  AudioPlayer,
  VideoStreamer,
} from "../lib/gemini-live/mediaUtils.js";

class ViewVisualChat extends HTMLElement {
  constructor() {
    super();
    this._language = null;
    this._fromLanguage = null;
  }

  set language(value) {
    this._language = value;
  }

  set fromLanguage(value) {
    this._fromLanguage = value;
  }

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    if (this.videoStreamer) this.videoStreamer.stop();
    if (this.audioStreamer) this.audioStreamer.stop();
    if (this.client) this.client.disconnect();
  }

  render() {
    const language = this._language || "French";
    const fromLanguage = this._fromLanguage || "English";

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
          <!-- Language Pill -->
          <div style="
            font-size: 0.85rem;
            font-weight: 700;
            color: var(--color-text-sub);
            margin-bottom: var(--spacing-sm);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            background: rgba(0,0,0,0.04);
            padding: 4px 12px;
            border-radius: var(--radius-full);
            width: fit-content;
            margin-left: auto;
            margin-right: auto;
            border: 1px solid rgba(0,0,0,0.05);
          ">
            <span>${fromLanguage}</span>
            <span style="opacity: 0.3; font-weight: normal;">&#10132;</span>
            <span style="color: var(--color-accent-primary);">${language}</span>
          </div>

          <h2 style="font-size: 1.5rem; margin-bottom: 2px; display: flex; align-items: center; justify-content: center; gap: 8px;">
            Visual Explorer
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
          <p style="opacity: 0.7; font-size: 1rem; margin-top: 4px;">Show objects to learn vocabulary</p>
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
        </div>

        <!-- Camera error message -->
        <p id="camera-error" style="
          text-align: center;
          color: var(--color-danger, #f44336);
          font-weight: 700;
          font-size: 0.9rem;
          display: none;
          margin-top: calc(-1 * var(--spacing-md));
          margin-bottom: var(--spacing-md);
        "></p>

        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: space-between; width: 100%; gap: 10px;">
          <!-- Model Visualizer -->
          <div style="width: 100%; height: 120px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <audio-visualizer id="model-viz"></audio-visualizer>
          </div>

          <!-- Transcript (always on for visual mode) -->
          <div style="width: 100%; height: 250px; margin: 10px 0; position: relative;">
            <live-transcript></live-transcript>
          </div>

          <!-- User Visualizer -->
          <div style="width: 100%; height: 120px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <audio-visualizer id="user-viz"></audio-visualizer>
          </div>
        </div>

        <style>
          .visual-cta-btn {
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

          .visual-cta-btn:hover {
            transform: translateY(-5px) scale(1.02);
            filter: brightness(1.1);
            box-shadow: 0 20px 40px -10px rgba(163, 177, 138, 0.4),
                        0 0 0 2px rgba(255,255,255,0.3) inset;
          }

          .visual-cta-btn:active {
            transform: translateY(-2px) scale(0.98);
          }

          .visual-cta-btn::after {
            content: '';
            position: absolute;
            top: 0; left: 0; width: 200%; height: 100%;
            background: linear-gradient(115deg, transparent 0%, transparent 45%, rgba(255, 255, 255, 0.3) 50%, transparent 55%, transparent 100%);
            transform: translateX(-150%) skewX(-15deg);
            transition: transform 0.6s;
          }

          .visual-cta-btn:hover::after {
            transform: translateX(150%) skewX(-15deg);
          }

          .visual-cta-btn.active {
            background: var(--color-danger) !important;
            flex-direction: row !important;
            gap: 12px;
          }
        </style>

        <div style="margin-bottom: var(--spacing-xxl); display: flex; flex-direction: column; gap: var(--spacing-lg); align-items: center;">
          <button id="explore-btn" class="visual-cta-btn">
            <span style="font-size: 1.3rem; font-weight: 800; margin-bottom: 2px; letter-spacing: 0.02em;">Start Exploring</span>
            <span style="font-size: 0.85rem; opacity: 0.9; font-style: italic;">Show objects to your camera!</span>
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
    const language = this._language || "French";
    const fromLanguage = this._fromLanguage || "English";
    const userViz = this.querySelector("#user-viz");
    const modelViz = this.querySelector("#model-viz");
    const exploreBtn = this.querySelector("#explore-btn");
    const statusEl = this.querySelector("#connection-status");
    const cameraContainer = this.querySelector("#camera-container");
    const cameraError = this.querySelector("#camera-error");
    let isActive = false;

    // Initialize Gemini Live
    this.client = new GeminiLiveAPI();
    this.audioStreamer = new AudioStreamer(this.client);
    this.audioPlayer = new AudioPlayer();
    this.videoStreamer = new VideoStreamer(this.client);

    // Client callbacks
    this.client.onConnectionStarted = () => {
      console.log("🚀 [Visual] Connection started");
    };

    this.client.onOpen = () => {
      console.log("🔓 [Visual] WebSocket connection opened");
    };

    this.client.onReceiveResponse = (response) => {
      if (response.type === MultimodalLiveResponseType.AUDIO) {
        this.audioPlayer.play(response.data);
      } else if (response.type === MultimodalLiveResponseType.TURN_COMPLETE) {
        const transcriptEl = this.querySelector("live-transcript");
        if (transcriptEl) transcriptEl.finalizeAll();
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
      console.error("❌ [Visual] Error:", error);
    };

    this.client.onClose = () => {
      console.log("🔒 [Visual] Connection closed");
    };

    // Back button
    this.querySelector("#back-to-missions").addEventListener("click", () => {
      if (this.videoStreamer) this.videoStreamer.stop();
      if (this.audioStreamer) this.audioStreamer.stop();
      if (this.client) this.client.disconnect();
      if (this.audioPlayer) this.audioPlayer.interrupt();

      if (userViz && userViz.disconnect) userViz.disconnect();
      if (modelViz && modelViz.disconnect) modelViz.disconnect();

      this.dispatchEvent(
        new CustomEvent("navigate", {
          bubbles: true,
          detail: { view: "missions" },
        })
      );
    });

    // Explore button
    exploreBtn.addEventListener("click", async () => {
      isActive = !isActive;

      if (isActive) {
        exploreBtn.classList.add("active");
        exploreBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
          <span style="font-weight: 800; font-size: 1.1rem; letter-spacing: 0.05em; text-transform: uppercase;">End Session</span>
        `;
      } else {
        // Stopping
        exploreBtn.classList.remove("active");
        if (this.videoStreamer) this.videoStreamer.stop();
        if (this.audioStreamer) this.audioStreamer.stop();
        if (this.client) this.client.disconnect();
        if (this.audioPlayer) this.audioPlayer.interrupt();
        if (userViz && userViz.disconnect) userViz.disconnect();
        if (modelViz && modelViz.disconnect) modelViz.disconnect();

        // Navigate back to missions (no summary for visual explorer)
        this.dispatchEvent(
          new CustomEvent("navigate", {
            bubbles: true,
            detail: { view: "missions" },
          })
        );
        return;
      }

      if (isActive) {
        console.log("📸 [Visual] Starting visual explorer session...");
        statusEl.textContent = "Connecting...";
        statusEl.style.color = "var(--color-text-sub)";
        cameraError.style.display = "none";

        try {
          // System instruction for Visual Explorer
          const systemInstruction = `
ROLE:
You are a friendly visual language tutor. You can see through the user's camera.

OBJECTIVE:
Help the user learn ${language} vocabulary by identifying objects they show you.
The user is a native ${fromLanguage} speaker.

INTERACTION PROTOCOL:
1. Object Detection: Identify the object, say its name in ${language}, provide ${fromLanguage} translation
2. Pronunciation: Say the word slowly, then at natural speed
3. Spelling Exercise: Ask user to spell it in ${language}
4. Feedback: Praise correct answers, gently correct mistakes
5. Follow-up: Ask a simple question using the word in ${language}
6. Vocabulary Building: Mention related words

LANGUAGE RULES:
- Primarily speak ${language}, use ${fromLanguage} for explanations
- Encourage user to respond in ${language}
- Adjust difficulty based on responses

CAMERA GUIDELINES:
- If object unclear, ask user to adjust angle
- If nothing shown, prompt "Show me something!"
- If camera dark or unclear, let user know
`;

          this.client.setSystemInstructions(systemInstruction);

          // Always enable transcription for visual mode
          this.client.setInputAudioTranscription(true);
          this.client.setOutputAudioTranscription(true);

          // Get reCAPTCHA token
          let token = "";
          try {
            token = await this.getRecaptchaToken();
          } catch (err) {
            console.error("Recaptcha failed:", err);
            this.resetSession(exploreBtn, userViz, modelViz, statusEl);
            isActive = false;
            return;
          }

          // Connect WebSocket
          await this.client.connect(token);

          // Start audio
          console.log("🎤 [Visual] Starting audio stream...");
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
          console.log("📹 [Visual] Starting camera...");
          try {
            const videoEl = await this.videoStreamer.start({
              fps: 1,
              width: 768,
              height: 768,
              facingMode: "user",
              quality: 0.8,
            });

            // Mount video preview
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
            console.error("❌ [Visual] Camera error:", camErr);
            let errorMsg = "Camera error: " + camErr.message;
            if (camErr.name === "NotAllowedError") {
              errorMsg = "Camera permission denied. Please allow camera access and try again.";
            } else if (camErr.name === "NotFoundError") {
              errorMsg = "No camera found. Please connect a camera and try again.";
            }
            cameraError.textContent = errorMsg;
            cameraError.style.display = "block";

            // Stop audio too since camera failed
            if (this.audioStreamer) this.audioStreamer.stop();
            if (this.client) this.client.disconnect();
            if (this.audioPlayer) this.audioPlayer.interrupt();
            this.resetSession(exploreBtn, userViz, modelViz, statusEl);
            isActive = false;
            return;
          }

          console.log("✨ [Visual] Session active!");
          statusEl.textContent = "Connected - show me something!";
          statusEl.style.color = "#4CAF50";

          // Play start sound
          const startSound = new Audio("/start-bell.mp3");
          startSound.volume = 0.6;
          startSound.play().catch((e) => console.error("Failed to play start sound:", e));
        } catch (err) {
          console.error("❌ [Visual] Failed to start session:", err);
          this.resetSession(exploreBtn, userViz, modelViz, statusEl);
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

  resetSession(btn, userViz, modelViz, statusEl) {
    btn.classList.remove("active");
    btn.innerHTML = `
      <span style="font-size: 1.3rem; font-weight: 800; margin-bottom: 2px; letter-spacing: 0.02em;">Start Exploring</span>
      <span style="font-size: 0.85rem; opacity: 0.9; font-style: italic;">Show objects to your camera!</span>
    `;
    if (userViz && userViz.disconnect) userViz.disconnect();
    if (modelViz && modelViz.disconnect) modelViz.disconnect();
    statusEl.textContent = "";
  }

  async getRecaptchaToken() {
    return new Promise((resolve) => {
      if (typeof grecaptcha === "undefined") {
        console.warn("⚠️ ReCAPTCHA not loaded (Simple Mode). Proceeding without token.");
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
            console.warn("⚠️ ReCAPTCHA execution failed:", e);
            resolve(null);
          }
        });
      } catch (e) {
        console.warn("⚠️ ReCAPTCHA ready failed:", e);
        resolve(null);
      }
    });
  }
}

customElements.define("view-visual-chat", ViewVisualChat);
