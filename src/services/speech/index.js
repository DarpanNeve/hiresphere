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
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = "en-US";

    this.synthesis = window.speechSynthesis;
    this.voices = [];
    this.isSpeaking = false;

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

  startContinuousRecognition(onInterimResult, onFinalResult) {
    // Reset recognition instance
    this.recognition.abort();

    let finalTranscriptBuffer = "";
    let lastInterimTimestamp = Date.now();
    const INTERIM_BUFFER_TIME = 500; // Reduced buffer time

    this.recognition.onresult = (event) => {
      if (this.isSpeaking) return;

      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          if (transcript.trim() !== finalTranscriptBuffer.trim()) {
            finalTranscript += transcript;
            finalTranscriptBuffer = transcript;
            if (onFinalResult) {
              onFinalResult(transcript);
            }
          }
        } else {
          const now = Date.now();
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

      if (event.error !== "aborted") {
        setTimeout(() => {
          if (this.isRecognizing && !this.isSpeaking) {
            this.startContinuousRecognition(onInterimResult, onFinalResult);
          }
        }, 500); // Reduced retry delay
      }
    };

    this.recognition.onend = () => {
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
