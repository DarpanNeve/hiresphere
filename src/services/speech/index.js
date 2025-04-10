// Web Speech API wrapper for speech recognition and synthesis
class SpeechService {
  constructor() {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      throw new Error("Speech recognition is not supported in this browser");
    }
    x;
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

        const utterance = new SpeechSynthesisUtterance(text);

        // Select a natural-sounding English voice
        if (!this.voices.length) {
          this.voices = this.synthesis.getVoices();
        }

        const preferredVoice =
          this.voices.find(
            (voice) =>
              voice.lang.includes("en") && voice.name.includes("Google") // Prefer Google voices
          ) ||
          this.voices.find(
            (voice) => voice.lang.includes("en") // Fallback to any English voice
          );

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onend = () => resolve();
        utterance.onerror = (error) => reject(error);

        this.synthesis.speak(utterance);
      } catch (error) {
        reject(error);
      }
    });
  }

  startContinuousRecognition(onInterimResult, onFinalResult) {
    // Reset recognition instance
    this.recognition.abort();

    this.recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          if (onFinalResult) {
            onFinalResult(transcript);
          }
        } else {
          interimTranscript += transcript;
          if (onInterimResult) {
            onInterimResult(transcript);
          }
        }
      }
    };

    this.recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);

      // Attempt to restart recognition on error
      if (event.error !== "aborted") {
        setTimeout(() => {
          this.startContinuousRecognition(onInterimResult, onFinalResult);
        }, 1000);
      }
    };

    this.recognition.onend = () => {
      // Automatically restart if recognition ends unexpectedly
      if (this.isRecognizing) {
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
}

export const speechService = new SpeechService();
