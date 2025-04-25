import * as tf from "@tensorflow/tfjs";
import * as faceDetection from "@tensorflow-models/face-detection";

class InterviewMonitor {
  constructor(options = {}) {
    this.options = {
      maxWarnings: options.maxWarnings || 3,
      warningTimeout: options.warningTimeout || 10000, // Reduced from 10000
      outOfFrameTimeout: options.outOfFrameTimeout || 1500, // Reduced from 2000
      maxHeadRotation: options.maxHeadRotation || 25, // Reduced from 30
      maxTabUnfocusTime: options.maxTabUnfocusTime || 500, // Reduced from 1000
      maxFaceViolations: options.maxFaceViolations || 10, // Reduced from 3
      detectionInterval: options.detectionInterval || 100, // Reduced from 200
      ...options,
    };

    // Debug mode for development
    this.debug = true;

    this.warnings = [];
    this.isMonitoring = false;
    this.lastWarningTime = 0;
    this.callbacks = {
      onWarning: null,
      onTerminate: null,
    };

    // Detection state with reduced thresholds
    this.faceDetector = null;
    this.detectionInterval = null;
    this.videoElement = null;
    this.lastFacePosition = null;
    this.consecutiveNoFaceFrames = 0;
    this.consecutiveMultipleFacesFrames = 0;
    this.consecutiveMovementFrames = 0;

    // Violation tracking with lower thresholds
    this.violations = {
      no_face_detected: 0,
      multiple_faces_detected: 0,
      excessive_movement: 0,
      excessive_tab_switching: 0,
      window_focus_lost: 0,
      blocked_key_press: 0,
      blocked_key_combination: 0,
      clipboard_operation: 0,
      context_menu: 0,
      mouse_leave: 0,
      screen_recording_detected: 0,
      dev_tools_detected: 0,
      console_tampering: 0,
      suspicious_window_state: 0,
      extended_tab_unfocus: 0,
      rapid_key_pressing: 0,
    };

    // Window state tracking
    this.originalWindowState = {
      width: window.outerWidth,
      height: window.outerHeight,
      screenX: window.screenX,
      screenY: window.screenY,
    };

    // Tab focus tracking with shorter timeouts
    this.tabFocusTime = Date.now();
    this.lastTabSwitchTime = Date.now();
    this.tabSwitchCount = 0;
    this.tabBlurCount = 0;
    this.lastTabBlurTime = 0;

    // Screen recording detection
    this.screenCaptureAttempts = 0;
    this.lastScreenCaptureCheck = Date.now();

    // Keyboard tracking
    this.lastKeyPressTime = Date.now();
    this.keyPressCount = 0;
    this.keyPressHistory = [];

    // Bind methods
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleWindowBlur = this.handleWindowBlur.bind(this);
    this.handleWindowFocus = this.handleWindowFocus.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
    this.handleContextMenu = this.handleContextMenu.bind(this);
    this.handleClipboardEvent = this.handleClipboardEvent.bind(this);

    // Initialize visibility API tracking
    this.lastVisibilityChange = Date.now();
    this.visibilityChangeCount = 0;

    // Debug logging
    if (this.debug) {
      console.log("InterviewMonitor initialized with options:", this.options);
    }
  }

  async initialize() {
    try {
      // Initialize TensorFlow.js with WebGL backend for better performance
      await tf.setBackend("webgl");
      await tf.ready();

      // Load face detection model with optimized settings
      this.faceDetector = await faceDetection.createDetector(
        faceDetection.SupportedModels.MediaPipeFaceDetector,
        {
          runtime: "tfjs",
          refineLandmarks: true,
          maxFaces: 2,
          scoreThreshold: 0.75,
        }
      );

      // Set up event listeners
      this.setupEventListeners();

      // Initialize periodic checks
      this.setupPeriodicChecks();

      // Initialize fullscreen monitoring
      this.setupFullscreenMonitoring();

      return true;
    } catch (error) {
      console.error("Failed to initialize monitoring:", error);
      return false;
    }
  }

  setupEventListeners() {
    // Tab visibility
    document.addEventListener("visibilitychange", this.handleVisibilityChange);

    // Window focus
    window.addEventListener("blur", this.handleWindowBlur);
    window.addEventListener("focus", this.handleWindowFocus);

    // Keyboard events
    document.addEventListener("keydown", this.handleKeyDown, true);

    // Mouse events
    document.addEventListener("mouseleave", this.handleMouseLeave);
    document.addEventListener("contextmenu", this.handleContextMenu);

    // Copy/Paste events
    document.addEventListener("copy", this.handleClipboardEvent);
    document.addEventListener("paste", this.handleClipboardEvent);
    document.addEventListener("cut", this.handleClipboardEvent);

    // Window events
    window.addEventListener("resize", this.handleWindowResize);
    window.addEventListener("beforeunload", this.handleBeforeUnload);

    // Fullscreen changes
    document.addEventListener(
      "fullscreenchange",
      this.handleFullscreenChange.bind(this)
    );
    document.addEventListener(
      "webkitfullscreenchange",
      this.handleFullscreenChange.bind(this)
    );
    document.addEventListener(
      "mozfullscreenchange",
      this.handleFullscreenChange.bind(this)
    );
    document.addEventListener(
      "MSFullscreenChange",
      this.handleFullscreenChange.bind(this)
    );
  }

  setupPeriodicChecks() {
    setInterval(() => {
      if (!this.isMonitoring) return;

      this.checkDevTools();
      this.checkWindowState();
      this.checkScreenCapture();
      this.checkTabFocus();
      this.checkVisibilityChanges();
      this.checkBrowserZoom();
    }, 1000);
  }

  setupFullscreenMonitoring() {
    // Track fullscreen state
    this.isFullscreen = false;
    this.fullscreenChangeCount = 0;
    this.lastFullscreenChange = Date.now();
  }

  async startFaceDetection() {
    if (!this.videoElement || !this.faceDetector) return;

    this.detectionInterval = setInterval(async () => {
      try {
        const faces = await this.faceDetector.estimateFaces(this.videoElement);

        // No face detected
        if (faces.length === 0) {
          this.consecutiveNoFaceFrames++;
          if (this.consecutiveNoFaceFrames >= 10) {
            // Reduced threshold
            this.addViolation("no_face_detected", "No face detected in frame");
            this.consecutiveNoFaceFrames = 0;
          }
        } else {
          this.consecutiveNoFaceFrames = 0;
        }

        // Multiple faces detected
        if (faces.length > 1) {
          this.consecutiveMultipleFacesFrames++;
          if (this.consecutiveMultipleFacesFrames >= 5) {
            // Reduced threshold
            this.addViolation(
              "multiple_faces_detected",
              "Multiple faces detected"
            );
            this.consecutiveMultipleFacesFrames = 0;
          }
        } else {
          this.consecutiveMultipleFacesFrames = 0;
        }

        // Check face movement and position
        if (faces.length === 1) {
          const face = faces[0];
          this.checkFaceMovement(face);
          this.checkFacePosition(face);
        }
      } catch (error) {
        console.error("Face detection error:", error);
      }
    }, this.options.detectionInterval);
  }

  checkFaceMovement(face) {
    const currentPosition = {
      x: face.box.xCenter || face.box.xMin + face.box.width / 2,
      y: face.box.yCenter || face.box.yMin + face.box.height / 2,
    };

    if (this.lastFacePosition) {
      const movement = Math.sqrt(
        Math.pow(currentPosition.x - this.lastFacePosition.x, 2) +
          Math.pow(currentPosition.y - this.lastFacePosition.y, 2)
      );

      if (movement > 20) {
        // Reduced threshold
        this.consecutiveMovementFrames++;
        if (this.consecutiveMovementFrames >= 5) {
          // Reduced threshold
          this.addViolation(
            "excessive_movement",
            "Excessive head movement detected"
          );
          this.consecutiveMovementFrames = 0;
        }
      } else {
        this.consecutiveMovementFrames = Math.max(
          0,
          this.consecutiveMovementFrames - 1
        );
      }
    }

    this.lastFacePosition = currentPosition;
  }

  checkFacePosition(face) {
    const videoWidth = this.videoElement.videoWidth;
    const videoHeight = this.videoElement.videoHeight;

    // Check if face is too close or too far
    const faceSize =
      (face.box.width * face.box.height) / (videoWidth * videoHeight);
    if (faceSize < 0.1 || faceSize > 0.5) {
      this.addViolation(
        "invalid_face_position",
        "Please maintain appropriate distance from camera"
      );
    }

    // Check if face is centered
    const centerX = face.box.xCenter || face.box.xMin + face.box.width / 2;
    const centerY = face.box.yCenter || face.box.yMin + face.box.height / 2;

    const offsetX = Math.abs(centerX - videoWidth / 2) / videoWidth;
    const offsetY = Math.abs(centerY - videoHeight / 2) / videoHeight;

    if (offsetX > 0.3 || offsetY > 0.3) {
      this.addViolation(
        "face_not_centered",
        "Please center your face in the frame"
      );
    }
  }

  handleVisibilityChange() {
    if (!this.isMonitoring) return;

    const now = Date.now();
    if (document.hidden) {
      this.visibilityChangeCount++;

      if (this.debug) {
        console.log(
          `Tab visibility change detected (${this.visibilityChangeCount})`
        );
      }

      // More aggressive visibility change detection
      if (this.visibilityChangeCount >= 2) {
        // Reduced from 3
        this.addViolation(
          "excessive_tab_switching",
          "Multiple tab switches detected"
        );
        this.visibilityChangeCount = 0;
      }

      // Track time hidden
      this.lastVisibilityChange = now;
    }
  }

  handleWindowBlur() {
    if (!this.isMonitoring) return;

    const now = Date.now();
    this.tabBlurCount++;
    this.lastTabBlurTime = now;

    if (this.debug) {
      console.log(`Window blur detected (${this.tabBlurCount})`);
    }

    // More aggressive blur detection
    if (this.tabBlurCount >= 2) {
      // Reduced from 3
      this.addViolation(
        "window_focus_lost",
        "Window focus lost multiple times"
      );
      this.tabBlurCount = 0;
    }

    const blurDuration = now - this.tabFocusTime;
    if (blurDuration > this.options.maxTabUnfocusTime) {
      this.addViolation(
        "extended_tab_unfocus",
        "Window focus lost for too long"
      );
    }
  }

  handleWindowFocus() {
    if (!this.isMonitoring) return;

    const now = Date.now();
    const unfocusedDuration = now - this.lastTabBlurTime;

    if (this.debug) {
      console.log(`Window focus restored after ${unfocusedDuration}ms`);
    }

    this.tabFocusTime = now;
  }

  handleKeyDown(event) {
    if (!this.isMonitoring) return;

    const now = Date.now();
    const blockedKeys = ["Tab", "PrintScreen", "F12", "F11", "Escape"];
    const blockedCombos = [
      { key: "c", ctrl: true },
      { key: "v", ctrl: true },
      { key: "p", ctrl: true },
      { key: "i", ctrl: true },
      { key: "u", ctrl: true },
      { key: "s", ctrl: true },
      { key: "r", ctrl: true },
      { key: "j", ctrl: true },
    ];

    // Track key press history
    this.keyPressHistory.push({
      key: event.key,
      timestamp: now,
      ctrl: event.ctrlKey,
      alt: event.altKey,
      shift: event.shiftKey,
    });

    // Keep only recent history
    this.keyPressHistory = this.keyPressHistory.filter(
      (press) => now - press.timestamp < 1000
    );

    if (this.debug) {
      console.log(
        `Key pressed: ${event.key} (${this.keyPressHistory.length} recent presses)`
      );
    }

    // Check for blocked keys
    if (blockedKeys.includes(event.key)) {
      event.preventDefault();
      this.addViolation(
        "blocked_key_press",
        `Blocked key pressed: ${event.key}`
      );
      return;
    }

    // Check for blocked combinations
    for (const combo of blockedCombos) {
      if (event.key.toLowerCase() === combo.key && event.ctrlKey) {
        event.preventDefault();
        this.addViolation(
          "blocked_key_combination",
          `Blocked combination: Ctrl+${combo.key}`
        );
        return;
      }
    }

    // Detect rapid key pressing
    if (this.keyPressHistory.length >= 5) {
      // Reduced from 10
      const timeSpan = now - this.keyPressHistory[0].timestamp;
      if (timeSpan < 1000) {
        // 1 second window
        this.addViolation(
          "rapid_key_pressing",
          "Suspicious rapid key pressing"
        );
        this.keyPressHistory = [];
      }
    }
  }

  handleClipboardEvent(event) {
    if (this.isMonitoring) {
      event.preventDefault();
      this.addViolation("clipboard_operation", "Clipboard operation attempted");
    }
  }

  handleContextMenu(event) {
    if (this.isMonitoring) {
      event.preventDefault();
      this.addViolation("context_menu", "Right-click menu attempted");
    }
  }

  handleMouseLeave(event) {
    if (this.isMonitoring && event.clientY <= 0) {
      this.addViolation("mouse_leave", "Mouse left the window");
    }
  }

  handleFullscreenChange() {
    if (!this.isMonitoring) return;

    const now = Date.now();
    const isCurrentlyFullscreen = Boolean(
      document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
    );

    if (this.isFullscreen !== isCurrentlyFullscreen) {
      this.fullscreenChangeCount++;
      if (this.fullscreenChangeCount >= 3) {
        this.addViolation("fullscreen_toggle", "Excessive fullscreen toggling");
      }
    }

    this.isFullscreen = isCurrentlyFullscreen;
    this.lastFullscreenChange = now;
  }

  checkBrowserZoom() {
    const zoom = Math.round((window.outerWidth / window.innerWidth) * 100);
    if (zoom !== 100) {
      this.addViolation("browser_zoom", "Browser zoom level changed");
    }
  }

  checkVisibilityChanges() {
    const now = Date.now();
    if (
      this.visibilityChangeCount > 5 &&
      now - this.lastVisibilityChange < 10000
    ) {
      this.addViolation(
        "suspicious_visibility_changes",
        "Suspicious tab visibility changes"
      );
      this.visibilityChangeCount = 0;
    }
  }

  addViolation(type, details = "") {
    const now = Date.now();

    // Reduced cooldown between violations
    if (now - this.lastWarningTime < 1000) return; // Reduced from 3000

    if (this.violations[type] === undefined) {
      this.violations[type] = 0;
    }

    this.violations[type]++;

    if (this.debug) {
      console.log(
        `Violation detected: ${type} (Count: ${this.violations[type]})`,
        details
      );
    }

    // More aggressive violation handling
    if (this.violations[type] >= 2) {
      // Reduced from 3
      this.addWarning(`${details || `Security violation detected: ${type}`}`);
    }

    this.lastWarningTime = now;
  }

  addWarning(reason) {
    const warning = {
      reason,
      timestamp: Date.now(),
      warningNumber: this.warnings.length + 1,
    };

    this.warnings.push(warning);

    if (this.debug) {
      console.log(
        `Warning added (${this.warnings.length}/${this.options.maxWarnings}):`,
        reason
      );
    }

    if (this.callbacks.onWarning) {
      this.callbacks.onWarning(warning);
    }

    // Check for termination with more aggressive threshold
    if (this.warnings.length >= this.options.maxWarnings) {
      if (this.debug) {
        console.log("Maximum warnings reached, terminating interview");
      }
      this.terminateInterview();
    }
  }

  terminateInterview() {
    this.isMonitoring = false;
    this.cleanup();

    if (this.callbacks.onTerminate) {
      this.callbacks.onTerminate({
        reason: "Interview terminated due to security violations",
        warnings: this.warnings,
        violations: this.violations,
      });
    }
  }

  cleanup() {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
    }

    // Remove all event listeners
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange
    );
    window.removeEventListener("blur", this.handleWindowBlur);
    window.removeEventListener("focus", this.handleWindowFocus);
    document.removeEventListener("keydown", this.handleKeyDown, true);
    document.removeEventListener("mouseleave", this.handleMouseLeave);
    document.removeEventListener("contextmenu", this.handleContextMenu);
    document.removeEventListener("copy", this.handleClipboardEvent);
    document.removeEventListener("paste", this.handleClipboardEvent);
    document.removeEventListener("cut", this.handleClipboardEvent);
    window.removeEventListener("resize", this.handleWindowResize);
    window.removeEventListener("beforeunload", this.handleBeforeUnload);
    document.removeEventListener(
      "fullscreenchange",
      this.handleFullscreenChange
    );
    document.removeEventListener(
      "webkitfullscreenchange",
      this.handleFullscreenChange
    );
    document.removeEventListener(
      "mozfullscreenchange",
      this.handleFullscreenChange
    );
    document.removeEventListener(
      "MSFullscreenChange",
      this.handleFullscreenChange
    );

    // Reset state
    this.isMonitoring = false;
    this.videoElement = null;
    this.lastFacePosition = null;
    Object.keys(this.violations).forEach((key) => {
      this.violations[key] = 0;
    });
  }

  startMonitoring(videoElement) {
    if (!videoElement) {
      throw new Error("Video element is required for monitoring");
    }

    if (!this.faceDetector) {
      throw new Error(
        "Face detector not initialized. Call initialize() first."
      );
    }

    this.videoElement = videoElement;
    this.isMonitoring = true;
    this.tabFocusTime = Date.now();
    this.lastWarningTime = Date.now();
    this.startFaceDetection();

    return true;
  }

  stopMonitoring() {
    this.cleanup();
    return true;
  }

  setCallback(type, callback) {
    if (
      typeof callback === "function" &&
      ["onWarning", "onTerminate"].includes(type)
    ) {
      this.callbacks[type] = callback;
      return true;
    }
    return false;
  }
}

export { InterviewMonitor };
