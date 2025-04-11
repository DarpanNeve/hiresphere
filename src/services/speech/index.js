// Web Speech API wrapper for speech recognition and synthesis
class SpeechService {
  constructor() {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      throw new Error("Speech recognition is not supported in this browser");
    }

    // Initialize speech recognition
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = "en-US";

    // Initialize speech synthesis
    this.synthesis = window.speechSynthesis;
    this.voices = [];

    // Track speaking state
    this.isSpeaking = false;

    // Load voices when they're available
    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = () => {
        this.voices = this.synthesis.getVoices();
      };
    }
  }

  async speakText(text) {
    return new Promise((resolve, reject) => {
      try {
        // Cancel any ongoing speech
        this.synthesis.cancel();
        this.isSpeaking = true;

        const utterance = new SpeechSynthesisUtterance(text);

        // Select a natural-sounding English voice
        if (!this.voices.length) {
          this.voices = this.synthesis.getVoices();
        }

        const preferredVoice =
          this.voices.find(
            (voice) =>
              voice.lang.includes("en") && voice.name.includes("Google")
          ) || this.voices.find((voice) => voice.lang.includes("en"));

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onend = () => {
          this.isSpeaking = false;
          resolve();
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

  startContinuousRecognition(onInterimResult, onFinalResult) {
    // Reset recognition instance
    this.recognition.abort();

    let finalTranscriptBuffer = "";
    let lastInterimTimestamp = Date.now();
    const INTERIM_BUFFER_TIME = 1000; // 1 second buffer for interim results

    this.recognition.onresult = (event) => {
      // Don't process results if we're speaking
      if (this.isSpeaking) return;

      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          // Check if this final result is different from the buffer
          if (transcript.trim() !== finalTranscriptBuffer.trim()) {
            finalTranscript += transcript;
            finalTranscriptBuffer = transcript;
            if (onFinalResult) {
              onFinalResult(transcript);
            }
          }
        } else {
          const now = Date.now();
          // Only process interim results if enough time has passed
          if (now - lastInterimTimestamp > INTERIM_BUFFER_TIME) {
            interimTranscript += transcript;
            if (onInterimResult) {
              onInterimResult(transcript);
            }
            lastInterimTimestamp = now;
          }
        }
      }
    };

    this.recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);

      // Attempt to restart recognition on error
      if (event.error !== "aborted") {
        setTimeout(() => {
          if (this.isRecognizing && !this.isSpeaking) {
            this.startContinuousRecognition(onInterimResult, onFinalResult);
          }
        }, 1000);
      }
    };

    this.recognition.onend = () => {
      // Automatically restart if recognition ends unexpectedly
      if (this.isRecognizing && !this.isSpeaking) {
        this.recognition.start();
      }
    };

    try {
      this.recognition.start();
      this.isRecognizing = true;
    } catch (error) {
      console.error("Failed to start speech recognition:", error);
    }

    return this.recognition;
  }

  stopContinuousRecognition(recognizer) {
    if (recognizer) {
      this.isRecognizing = false;
      recognizer.abort();
    }
  }

  isCurrentlySpeaking() {
    return this.isSpeaking;
  }
}

export const speechService = new SpeechService();
