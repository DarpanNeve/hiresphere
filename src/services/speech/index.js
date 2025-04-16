class SpeechService {
  constructor() {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      throw new Error("Speech recognition is not supported in this browser");
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = "en-US";

    // Add noise handling settings
    this.recognition.maxAlternatives = 1;

    this.synthesis = window.speechSynthesis;
    this.voices = [];
    this.isSpeaking = false;
    this.isRecognizing = false;
    this.hasRecordingPermission = null; // Track microphone permission status
    this.processedResults = new Set();
    this.noiseThreshold = 0.7;
    this.audioContext = null;
    this.audioStream = null;

    // Pre-load voices
    this.loadVoices();
    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = () => this.loadVoices();
    }
  }

  loadVoices() {
    this.voices = this.synthesis.getVoices();
    // Pre-select preferred voice
    this.preferredVoice =
      this.voices.find(
        (voice) => voice.lang.includes("en") && voice.name.includes("Google")
      ) || this.voices.find((voice) => voice.lang.includes("en"));
  }

  async speakText(text) {
    return new Promise((resolve, reject) => {
      try {
        // Cancel any ongoing speech
        this.synthesis.cancel();
        this.isSpeaking = true;

        const utterance = new SpeechSynthesisUtterance(text);

        if (this.preferredVoice) {
          utterance.voice = this.preferredVoice;
        }

        // Optimize speech parameters
        utterance.rate = 1.1; // Slightly faster
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onend = () => {
          this.isSpeaking = false;
          // Add small delay before resolving
          setTimeout(resolve, 300);
        };

        utterance.onerror = (error) => {
          this.isSpeaking = false;
          reject(error);
        };

        this.synthesis.speak(utterance);
      } catch (error) {
        this.isSpeaking = false;
        reject(error);
      }
    });
  }

  // Check and request microphone permissions explicitly
  async checkMicrophonePermission() {
    try {
      if (this.hasRecordingPermission === true) {
        return true;
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Test that we're actually getting audio data
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext ||
          window.webkitAudioContext)();
      }

      // Create analyzer to check audio levels
      const analyser = this.audioContext.createAnalyser();
      const microphone = this.audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);

      // Keep track of the stream for cleanup
      this.audioStream = stream;
      this.hasRecordingPermission = true;

      return true;
    } catch (error) {
      console.error("Microphone permission error:", error);
      this.hasRecordingPermission = false;
      return false;
    }
  }

  // Monitor audio input levels to detect if microphone is working
  startAudioLevelMonitoring(onAudioDetected) {
    if (!this.audioContext || !this.audioStream) return;

    const analyser = this.audioContext.createAnalyser();
    const microphone = this.audioContext.createMediaStreamSource(
      this.audioStream
    );
    microphone.connect(analyser);

    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkAudioLevel = () => {
      if (!this.isRecognizing) return;

      analyser.getByteFrequencyData(dataArray);

      // Calculate average audio level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;

      // If we detect audio but no speech is being recognized,
      // the microphone might be working but recognition is failing
      if (average > 10 && onAudioDetected) {
        onAudioDetected(average);
      }

      if (this.isRecognizing) {
        requestAnimationFrame(checkAudioLevel);
      }
    };

    checkAudioLevel();
  }

  async startContinuousRecognition(
    onInterimResult,
    onFinalResult,
    onAudioLevel
  ) {
    try {
      // First check microphone permission
      const hasPermission = await this.checkMicrophonePermission();
      if (!hasPermission) {
        throw new Error(
          "Microphone permission denied. Speech recognition requires microphone access."
        );
      }

      // Stop any existing recognition
      if (this.isRecognizing) {
        this.stopContinuousRecognition();
        // Add a small delay before restarting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      this.processedResults.clear(); // Reset processed results
      let silenceTimer = null;
      const SILENCE_TIMEOUT = 1500; // Milliseconds of silence before restarting
      let consecutiveEmptyResults = 0;

      // Start monitoring audio levels
      this.startAudioLevelMonitoring((level) => {
        if (onAudioLevel) onAudioLevel(level);
      });

      this.recognition.onstart = () => {
        this.isRecognizing = true;
        console.log("Speech recognition started");
      };

      this.recognition.onresult = (event) => {
        if (this.isSpeaking) return;

        // Clear any pending silence timer
        if (silenceTimer) {
          clearTimeout(silenceTimer);
          silenceTimer = null;
        }

        const result = event.results[event.results.length - 1];
        const transcript = result[0].transcript.trim();
        const confidence = result[0].confidence;
        const isConfident = confidence > this.noiseThreshold;

        // Skip if result is likely noise (low confidence)
        if (!transcript) {
          consecutiveEmptyResults++;
          if (consecutiveEmptyResults > 3) {
            // If we get multiple empty results, try restarting
            this.restartRecognition();
            consecutiveEmptyResults = 0;
          }
          return;
        } else {
          consecutiveEmptyResults = 0;
        }

        // Handle interim and final results
        if (!result.isFinal) {
          if (onInterimResult && transcript && isConfident) {
            onInterimResult(transcript);
          }
        } else {
          // Ensure we don't process the same final result multiple times
          const resultKey = transcript.toLowerCase();
          if (!this.processedResults.has(resultKey) && isConfident) {
            this.processedResults.add(resultKey);
            if (onFinalResult) {
              onFinalResult(transcript);
            }
          }
        }
      };

      this.recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);

        // Don't restart if we're not supposed to be recognizing
        if (!this.isRecognizing || this.isSpeaking) return;

        switch (event.error) {
          case "no-speech":
            // Only restart after a brief pause
            setTimeout(() => this.restartRecognition(), 1000);
            break;
          case "audio-capture":
            // Major problem with audio capture device
            this.reinitializeAudioCapture().then(() => {
              if (this.isRecognizing && !this.isSpeaking) {
                this.restartRecognition();
              }
            });
            break;
          case "network":
            // Wait longer for network issues
            setTimeout(() => this.restartRecognition(), 3000);
            break;
          default:
            // For other errors, try a simple restart if appropriate
            setTimeout(() => this.restartRecognition(), 1000);
        }
      };

      this.recognition.onend = () => {
        // Only restart if we're still actively recognizing and not speaking
        if (this.isRecognizing && !this.isSpeaking) {
          // Start a silence timer - only restart after a short pause
          silenceTimer = setTimeout(() => {
            this.restartRecognition();
          }, SILENCE_TIMEOUT);
        }
      };

      // Start recognition
      this.isRecognizing = true;
      this.recognition.start();

      return {
        isActive: () => this.isRecognizing,
        stop: () => this.stopContinuousRecognition(),
      };
    } catch (error) {
      console.error("Failed to start speech recognition:", error);
      this.isRecognizing = false;
      throw error;
    }
  }

  async reinitializeAudioCapture() {
    // Clean up existing resources
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;
    }

    // Try to get fresh permissions
    this.hasRecordingPermission = null;
    return this.checkMicrophonePermission();
  }

  restartRecognition() {
    if (!this.isRecognizing || this.isSpeaking) return;

    try {
      // Make sure recognition is reset before restarting
      this.recognition.abort();
      setTimeout(() => {
        if (this.isRecognizing && !this.isSpeaking) {
          this.recognition.start();
        }
      }, 500); // Increased delay to ensure proper cleanup
    } catch (error) {
      console.error("Failed to restart speech recognition:", error);
      this.isRecognizing = false;
    }
  }

  stopContinuousRecognition() {
    this.isRecognizing = false;
    try {
      this.recognition.abort(); // Use abort() instead of stop() for immediate effect
    } catch (error) {
      // Ignore errors when stopping
      console.log("Recognition already stopped");
    }

    // Cleanup audio monitoring
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
    }
  }

  isCurrentlySpeaking() {
    return this.isSpeaking;
  }

  setNoiseThreshold(threshold) {
    // Allow adjusting the noise filtering threshold (0.0 to 1.0)
    if (threshold >= 0 && threshold <= 1) {
      this.noiseThreshold = threshold;
    }
  }
}

export const speechService = new SpeechService();
