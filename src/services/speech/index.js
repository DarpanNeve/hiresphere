// SpeechService.js

class SpeechService {
  constructor() {
    console.log("[SpeechService] Initializing speech service");

    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      console.error(
        "[SpeechService] Speech recognition not supported in this browser"
      );
      throw new Error("Speech recognition is not supported in this browser");
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    // ← ENABLE TRUE CONTINUOUS LISTENING
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.lang = "en-US";
    this.recognition.maxAlternatives = 1;

    console.log("[SpeechService] Speech recognition configured with:", {
      continuous: this.recognition.continuous,
      interimResults: this.recognition.interimResults,
      lang: this.recognition.lang,
      maxAlternatives: this.recognition.maxAlternatives,
    });

    this.synthesis = window.speechSynthesis;
    this.voices = [];
    this.isSpeaking = false;
    this.isRecognizing = false;
    this.isTransitioning = false;
    this.hasRecordingPermission = null;
    this.processedResults = new Set();
    this.noiseThreshold = 0.5;
    this.audioContext = null;
    this.audioStream = null;
    this.restartTimeout = null;
    this.silenceTimeout = null;
    this.lastSpeechTime = Date.now();

    console.log("[SpeechService] Initial state configured");

    this.loadVoices();
    if (this.synthesis.onvoiceschanged !== undefined) {
      console.log("[SpeechService] Setting up onvoiceschanged listener");
      this.synthesis.onvoiceschanged = () => this.loadVoices();
    }
  }

  loadVoices() {
    console.log("[SpeechService] Loading available voices");
    this.voices = this.synthesis.getVoices();
    console.log(`[SpeechService] Found ${this.voices.length} voices`);

    this.preferredVoice =
      this.voices.find(
        (voice) => voice.lang.includes("en") && voice.name.includes("Google")
      ) || this.voices.find((voice) => voice.lang.includes("en"));

    if (this.preferredVoice) {
      console.log(
        `[SpeechService] Selected preferred voice: ${this.preferredVoice.name} (${this.preferredVoice.lang})`
      );
    } else {
      console.warn("[SpeechService] No preferred English voice found");
    }
  }

  async speakText(text) {
    console.log(
      `[SpeechService] Speaking text: "${text.substring(0, 50)}${
        text.length > 50 ? "..." : ""
      }"`
    );

    return new Promise((resolve, reject) => {
      try {
        console.log("[SpeechService] Canceling any ongoing speech");
        this.synthesis.cancel();
        this.isSpeaking = true;
        console.log("[SpeechService] isSpeaking set to true");

        const utterance = new SpeechSynthesisUtterance(text);
        if (this.preferredVoice) {
          utterance.voice = this.preferredVoice;
          console.log(
            `[SpeechService] Using voice: ${this.preferredVoice.name}`
          );
        } else {
          console.log(
            "[SpeechService] Using default voice (no preferred voice set)"
          );
        }

        utterance.rate = 1.1;
        utterance.pitch = 1;
        utterance.volume = 1;

        console.log("[SpeechService] Utterance configured with:", {
          rate: utterance.rate,
          pitch: utterance.pitch,
          volume: utterance.volume,
        });

        utterance.onend = () => {
          console.log("[SpeechService] Speech completed");
          this.isSpeaking = false;
          console.log("[SpeechService] isSpeaking set to false");
          console.log(
            "[SpeechService] Resolving promise after speech completed (with 300ms delay)"
          );
          setTimeout(resolve, 300);
        };

        utterance.onerror = (error) => {
          console.error("[SpeechService] Speech synthesis error:", error);
          this.isSpeaking = false;
          console.log("[SpeechService] isSpeaking set to false due to error");
          reject(error);
        };

        console.log("[SpeechService] Starting speech synthesis");
        this.synthesis.speak(utterance);
      } catch (error) {
        console.error("[SpeechService] Error in speakText:", error);
        this.isSpeaking = false;
        console.log("[SpeechService] isSpeaking set to false due to exception");
        reject(error);
      }
    });
  }

  async checkMicrophonePermission() {
    console.log("[SpeechService] Checking microphone permission");

    try {
      if (this.hasRecordingPermission === true) {
        console.log("[SpeechService] Microphone permission already granted");
        return true;
      }

      console.log("[SpeechService] Requesting microphone access");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      console.log("[SpeechService] Microphone access granted");

      if (!this.audioContext) {
        console.log("[SpeechService] Creating new AudioContext");
        this.audioContext = new (window.AudioContext ||
          window.webkitAudioContext)();
        console.log(
          "[SpeechService] AudioContext created, state:",
          this.audioContext.state
        );
      }

      console.log("[SpeechService] Setting up audio analyzer");
      const analyser = this.audioContext.createAnalyser();
      const microphone = this.audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      console.log("[SpeechService] Audio analyzer connected");

      this.audioStream = stream;
      this.hasRecordingPermission = true;
      console.log(
        "[SpeechService] Audio stream saved and permission flag set to true"
      );

      return true;
    } catch (error) {
      console.error("[SpeechService] Microphone permission error:", error);
      this.hasRecordingPermission = false;
      console.log("[SpeechService] Permission flag set to false due to error");
      return false;
    }
  }

  startAudioLevelMonitoring(onAudioDetected) {
    console.log("[SpeechService] Starting audio level monitoring");

    if (!this.audioContext || !this.audioStream) {
      console.warn(
        "[SpeechService] Cannot start audio monitoring: audioContext or audioStream not available"
      );
      return;
    }

    console.log("[SpeechService] Creating analyzer for audio monitoring");
    const analyser = this.audioContext.createAnalyser();
    const microphone = this.audioContext.createMediaStreamSource(
      this.audioStream
    );
    microphone.connect(analyser);

    analyser.fftSize = 1024;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    console.log(
      `[SpeechService] Analyzer configured with fftSize=${analyser.fftSize}, bufferLength=${bufferLength}`
    );

    const checkAudioLevel = () => {
      if (!this.isRecognizing) {
        console.log(
          "[SpeechService] Audio monitoring stopped: not recognizing"
        );
        return;
      }

      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;

      if (average > 5 && onAudioDetected) {
        this.lastSpeechTime = Date.now();
        onAudioDetected(average);
      }

      if (this.isRecognizing) {
        requestAnimationFrame(checkAudioLevel);
      }
    };

    console.log("[SpeechService] Starting audio level check loop");
    checkAudioLevel();
  }

  async startContinuousRecognition(
    onInterimResult,
    onFinalResult,
    onAudioLevel
  ) {
    console.log("[SpeechService] Starting continuous recognition");

    try {
      console.log("[SpeechService] Checking microphone permission");
      const hasPermission = await this.checkMicrophonePermission();
      if (!hasPermission) {
        console.error("[SpeechService] Microphone permission denied");
        throw new Error("Microphone permission denied");
      }

      if (this.isRecognizing || this.isTransitioning) {
        console.log(
          "[SpeechService] Recognition already active or transitioning"
        );
        return {
          isActive: () => this.isRecognizing,
          stop: () => this.stopContinuousRecognition(),
        };
      }

      console.log("[SpeechService] Cleaning up previous recognition session");
      this.cleanup();
      this.processedResults.clear();
      console.log("[SpeechService] Processed results cleared");

      this.isTransitioning = true;
      console.log("[SpeechService] isTransitioning set to true");

      console.log("[SpeechService] Starting audio level monitoring");
      this.startAudioLevelMonitoring((level) => {
        if (onAudioLevel) {
          onAudioLevel(level);
        }
      });

      console.log("[SpeechService] Setting up recognition event handlers");

      this.recognition.onstart = () => {
        console.log("[SpeechService] Recognition STARTED");
        this.isRecognizing = true;
        console.log("[SpeechService] isRecognizing set to true");
        this.isTransitioning = false;
        console.log("[SpeechService] isTransitioning set to false");
        this.lastSpeechTime = Date.now();
      };

      this.recognition.onresult = (event) => {
        if (this.isSpeaking) {
          console.log(
            "[SpeechService] Ignoring recognition result because system is speaking"
          );
          return;
        }

        const result = event.results[event.results.length - 1];
        const transcript = result[0].transcript.trim();

        if (!transcript) {
          console.log("[SpeechService] Empty transcript, ignoring");
          return;
        }

        this.lastSpeechTime = Date.now();
        console.log("[SpeechService] Updated lastSpeechTime");

        if (!result.isFinal) {
          console.log(`[SpeechService] Interim result: "${transcript}"`);
          if (onInterimResult) {
            onInterimResult(transcript);
          }
        } else {
          console.log(`[SpeechService] Final result: "${transcript}"`);
          const key = transcript.toLowerCase();
          if (!this.processedResults.has(key)) {
            console.log("[SpeechService] New unique result, processing");
            this.processedResults.add(key);
            console.log(
              `[SpeechService] Result added to processed set (${this.processedResults.size} total)`
            );
            if (onFinalResult) {
              onFinalResult(transcript);
            }
          } else {
            console.log("[SpeechService] Duplicate result, ignoring");
          }
        }
      };

      this.recognition.onerror = (event) => {
        console.error(
          `[SpeechService] Recognition ERROR: ${event.error}`,
          event
        );

        if (!this.isRecognizing || this.isSpeaking) {
          console.log(
            "[SpeechService] Not handling error because not recognizing or is speaking"
          );
          return;
        }

        if (event.error === "no-speech") {
          console.log("[SpeechService] No speech detected; continuing");
        } else if (event.error === "aborted" || event.error === "network") {
          console.log("[SpeechService] Critical error, stopping recognition");
          this.isTransitioning = false;
          this.isRecognizing = false;
        }
      };

      this.recognition.onend = () => {
        console.log("[SpeechService] Recognition ENDED");
        console.log("[SpeechService] State at end:", {
          isRecognizing: this.isRecognizing,
          isSpeaking: this.isSpeaking,
          isTransitioning: this.isTransitioning,
        });
        // Continuous mode stays open—no manual restart
        this.isTransitioning = false;
        console.log("[SpeechService] isTransitioning set to false at end");
      };

      console.log("[SpeechService] Calling recognition.start()");
      this.isRecognizing = true;
      console.log("[SpeechService] isRecognizing set to true before starting");
      this.recognition.start();

      console.log(
        "[SpeechService] Continuous recognition started successfully"
      );
      return {
        isActive: () => this.isRecognizing,
        stop: () => this.stopContinuousRecognition(),
      };
    } catch (error) {
      console.error(
        "[SpeechService] Failed to start speech recognition:",
        error
      );
      this.isRecognizing = false;
      this.isTransitioning = false;
      throw error;
    }
  }

  setupSilenceDetection() {
    console.log("[SpeechService] (silence detection disabled)");
  }

  restartRecognition() {
    console.log("[SpeechService] (restart disabled)");
  }

  cleanup() {
    console.log("[SpeechService] Cleaning up resources");

    if (this.restartTimeout) {
      console.log("[SpeechService] Clearing restart timeout");
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    if (this.silenceTimeout) {
      console.log("[SpeechService] Clearing silence timeout");
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }

    if (this.recognition) {
      try {
        console.log("[SpeechService] Stopping recognition during cleanup");
        this.recognition.stop();
        console.log(
          "[SpeechService] Recognition stopped successfully during cleanup"
        );
      } catch (error) {
        console.log(
          "[SpeechService] Error stopping recognition during cleanup (often normal):",
          error
        );
      }
    }

    console.log("[SpeechService] Cleanup completed");
  }

  stopContinuousRecognition() {
    console.log("[SpeechService] Stopping continuous recognition");
    this.isRecognizing = false;
    console.log("[SpeechService] isRecognizing set to false");

    console.log("[SpeechService] Running cleanup");
    this.cleanup();

    if (this.audioStream) {
      console.log("[SpeechService] Stopping audio tracks");
      this.audioStream.getTracks().forEach((track) => {
        console.log(
          `[SpeechService] Stopping audio track: ${track.kind}, enabled=${track.enabled}, readyState=${track.readyState}`
        );
        track.stop();
      });
      console.log("[SpeechService] All audio tracks stopped");
    } else {
      console.log("[SpeechService] No audio stream to stop");
    }

    console.log("[SpeechService] Continuous recognition stopped successfully");
  }

  isCurrentlySpeaking() {
    const speaking = this.isSpeaking;
    console.log(
      `[SpeechService] isCurrentlySpeaking() called, returning: ${speaking}`
    );
    return speaking;
  }

  setNoiseThreshold(threshold) {
    console.log(`[SpeechService] Setting noise threshold to: ${threshold}`);
    if (threshold >= 0 && threshold <= 1) {
      this.noiseThreshold = threshold;
      console.log(`[SpeechService] Noise threshold set to ${threshold}`);
    } else {
      console.warn(
        `[SpeechService] Invalid noise threshold value: ${threshold}, must be between 0 and 1`
      );
    }
  }
}

export const speechService = new SpeechService();
