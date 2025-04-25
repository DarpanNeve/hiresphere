import * as tf from "@tensorflow/tfjs";
import * as faceDetection from "@tensorflow-models/face-detection";

class InterviewMonitor {
  constructor(options = {}) {
    this.options = {
      maxWarnings: 3,
      warningTimeout: 5000,
      outOfFrameTimeout: 3000,
      maxHeadRotation: 35,
      maxTabUnfocusTime: 2000,
      maxFaceViolations: 3,
      detectionInterval: 200,
      ...options,
    };

    this.debug = true;
    this.warnings = [];
    this.isMonitoring = false;
    this.lastWarningTime = 0;
    this.callbacks = {
      onWarning: null,
      onTerminate: null,
    };

    // Detection state
    this.faceDetector = null;
    this.detectionInterval = null;
    this.videoElement = null;
    this.lastFacePosition = null;
    this.consecutiveNoFaceFrames = 0;
    this.consecutiveMultipleFacesFrames = 0;
    this.consecutiveMovementFrames = 0;

    // Violation tracking
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

    // Tab focus tracking
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
    // this.handleWindowResize = this.handleWindowResize.bind(this);
    // this.handleBeforeUnload = this.handleBeforeUnload.bind(this);

    // Initialize visibility API tracking
    this.lastVisibilityChange = Date.now();
    this.visibilityChangeCount = 0;

    if (this.debug) {
      console.log("InterviewMonitor initialized with options:", this.options);
    }
  }

  async initialize() {
    try {
      await tf.setBackend("webgl");
      await tf.ready();

      this.faceDetector = await faceDetection.createDetector(
        faceDetection.SupportedModels.MediaPipeFaceDetector,
        {
          runtime: "tfjs",
          refineLandmarks: true,
          maxFaces: 2,
          scoreThreshold: 0.6,
        }
      );

      this.setupEventListeners();
      this.setupPeriodicChecks();
      this.setupFullscreenMonitoring();

      return true;
    } catch (error) {
      console.error("Failed to initialize monitoring:", error);
      return false;
    }
  }

  setupEventListeners() {
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    window.addEventListener("blur", this.handleWindowBlur);
    window.addEventListener("focus", this.handleWindowFocus);
    document.addEventListener("keydown", this.handleKeyDown, true);
    document.addEventListener("mouseleave", this.handleMouseLeave);
    document.addEventListener("contextmenu", this.handleContextMenu);
    document.addEventListener("copy", this.handleClipboardEvent);
    document.addEventListener("paste", this.handleClipboardEvent);
    document.addEventListener("cut", this.handleClipboardEvent);
    window.addEventListener("resize", this.handleWindowResize);
    window.addEventListener("beforeunload", this.handleBeforeUnload);
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

  handleWindowResize() {
    if (!this.isMonitoring) return;
    const { width, height, screenX, screenY } = window;
    const deltaW = Math.abs(width - this.originalWindowState.width);
    const deltaH = Math.abs(height - this.originalWindowState.height);
    const deltaX = Math.abs(screenX - this.originalWindowState.screenX);
    const deltaY = Math.abs(screenY - this.originalWindowState.screenY);

    // too much resize or move
    if (deltaW > 50 || deltaH > 50 || deltaX > 20 || deltaY > 20) {
      this.addViolation(
        "suspicious_window_state",
        "Please keep the window size and position unchanged"
      );
      // reset baseline to avoid repeated triggers
      this.originalWindowState = { width, height, screenX, screenY };
    }
  }

  /**
   * Fires before unload (navigate away / refresh); warn user.
   */
  handleBeforeUnload(event) {
    if (!this.isMonitoring) return;
    this.addViolation(
      "window_navigation",
      "Navigation away from the interview is not allowed"
    );
    // Chrome requires returnValue to be set for a confirmation dialog
    event.preventDefault();
    event.returnValue = "";
  }

  /**
   * Periodic check for DevTools open (rudimentary).
   */
  checkDevTools() {
    const threshold = 160; // px
    const widthDiff = window.outerWidth - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;
    if (widthDiff > threshold || heightDiff > threshold) {
      this.addViolation(
        "dev_tools_detected",
        "Developer tools are not allowed"
      );
    }
  }

  /**
   * Periodic check for screen‐capture attempts.
   */
  checkScreenCapture() {
    const now = Date.now();
    // if any PrintScreen presses were seen recently (tracked in key handler), trigger here
    if (
      this.screenCaptureAttempts > 0 &&
      now - this.lastScreenCaptureCheck > this.options.warningTimeout
    ) {
      this.addViolation(
        "screen_recording_detected",
        "Screen capture is not allowed"
      );
      this.screenCaptureAttempts = 0;
      this.lastScreenCaptureCheck = now;
    }
  }

  /**
   * Periodic check that the interview tab hasn't been unfocused too long.
   */
  checkTabFocus() {
    if (!document.hasFocus()) {
      const now = Date.now();
      const unfocusedDuration = now - this.lastTabBlurTime;
      if (unfocusedDuration > this.options.maxTabUnfocusTime) {
        this.addViolation(
          "extended_tab_unfocus",
          "Interview window focus lost for too long"
        );
        // reset so we don't spam
        this.lastTabBlurTime = now;
      }
    }
  }

  /**
   * Periodic check for overall window‐state anomalies.
   */
  checkWindowState() {
    // Reuse handleWindowResize logic for periodic sanity check:
    this.handleWindowResize();
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
    }, 1500);
  }

  setupFullscreenMonitoring() {
    this.isFullscreen = false;
    this.fullscreenChangeCount = 0;
    this.lastFullscreenChange = Date.now();
  }

  async startFaceDetection() {
    if (!this.videoElement || !this.faceDetector) return;

    this.detectionInterval = setInterval(async () => {
      try {
        const faces = await this.faceDetector.estimateFaces(this.videoElement);

        if (faces.length === 0) {
          this.consecutiveNoFaceFrames++;
          if (this.consecutiveNoFaceFrames >= 15) {
            this.addViolation(
              "no_face_detected",
              "Please stay within camera view"
            );
            this.consecutiveNoFaceFrames = 0;
          }
        } else {
          this.consecutiveNoFaceFrames = 0;
        }

        if (faces.length > 1) {
          this.consecutiveMultipleFacesFrames++;
          if (this.consecutiveMultipleFacesFrames >= 10) {
            this.addViolation(
              "multiple_faces_detected",
              "Only one person should be visible"
            );
            this.consecutiveMultipleFacesFrames = 0;
          }
        } else {
          this.consecutiveMultipleFacesFrames = 0;
        }

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

      if (movement > 35) {
        this.consecutiveMovementFrames++;
        if (this.consecutiveMovementFrames >= 8) {
          this.addViolation(
            "excessive_movement",
            "Please maintain a steady position"
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

    const faceSize =
      (face.box.width * face.box.height) / (videoWidth * videoHeight);
    // if (faceSize < 0.08 || faceSize > 0.6) {
    //   this.addViolation(
    //     "invalid_face_position",
    //     "Please maintain appropriate distance from camera"
    //   );
    // }

    const centerX = face.box.xCenter || face.box.xMin + face.box.width / 2;
    const centerY = face.box.yCenter || face.box.yMin + face.box.height / 2;

    const offsetX = Math.abs(centerX - videoWidth / 2) / videoWidth;
    const offsetY = Math.abs(centerY - videoHeight / 2) / videoHeight;

    // if (offsetX > 0.4 || offsetY > 0.4) {
    //   this.addViolation(
    //     "face_not_centered",
    //     "Please center yourself in the frame"
    //   );
    // }
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

      if (this.visibilityChangeCount >= 3) {
        this.addViolation(
          "excessive_tab_switching",
          "Please stay focused on the interview"
        );
        this.visibilityChangeCount = 0;
      }

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

    if (this.tabBlurCount >= 3) {
      this.addViolation(
        "window_focus_lost",
        "Please maintain focus on the interview window"
      );
      this.tabBlurCount = 0;
    }

    const blurDuration = now - this.tabFocusTime;
    if (blurDuration > this.options.maxTabUnfocusTime) {
      this.addViolation(
        "extended_tab_unfocus",
        "Interview window focus lost for too long"
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
    const blockedKeys = ["PrintScreen", "F12", "F11"];
    const blockedCombos = [
      { key: "p", ctrl: true },
      { key: "s", ctrl: true },
      { key: "r", ctrl: true },
    ];

    this.keyPressHistory.push({
      key: event.key,
      timestamp: now,
      ctrl: event.ctrlKey,
      alt: event.altKey,
      shift: event.shiftKey,
    });

    this.keyPressHistory = this.keyPressHistory.filter(
      (press) => now - press.timestamp < 1500
    );

    if (this.debug) {
      console.log(
        `Key pressed: ${event.key} (${this.keyPressHistory.length} recent presses)`
      );
    }

    if (blockedKeys.includes(event.key)) {
      event.preventDefault();
      this.addViolation(
        "blocked_key_press",
        `This key is not allowed during the interview`
      );
      return;
    }

    for (const combo of blockedCombos) {
      if (event.key.toLowerCase() === combo.key && event.ctrlKey) {
        event.preventDefault();
        this.addViolation(
          "blocked_key_combination",
          `This keyboard shortcut is not allowed`
        );
        return;
      }
    }

    if (this.keyPressHistory.length >= 10) {
      const timeSpan = now - this.keyPressHistory[0].timestamp;
      if (timeSpan < 1000) {
        this.addViolation(
          "rapid_key_pressing",
          "Unusual keyboard activity detected"
        );
        this.keyPressHistory = [];
      }
    }
  }

  handleClipboardEvent(event) {
    if (this.isMonitoring) {
      event.preventDefault();
      this.addViolation(
        "clipboard_operation",
        "Clipboard operations are not allowed during the interview"
      );
    }
  }

  handleContextMenu(event) {
    if (this.isMonitoring) {
      event.preventDefault();
      this.addViolation(
        "context_menu",
        "Right-click menu is disabled during the interview"
      );
    }
  }

  handleMouseLeave(event) {
    if (this.isMonitoring && event.clientY <= -25) {
      this.addViolation(
        "mouse_leave",
        "Please keep your cursor within the interview window"
      );
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
      if (this.fullscreenChangeCount >= 4) {
        this.addViolation(
          "fullscreen_toggle",
          "Please maintain a consistent view mode"
        );
      }
    }

    this.isFullscreen = isCurrentlyFullscreen;
    this.lastFullscreenChange = now;
  }

  checkBrowserZoom() {
    const zoom = Math.round((window.outerWidth / window.innerWidth) * 100);
    if (zoom < 75 || zoom > 125) {
      this.addViolation("browser_zoom", "Please maintain standard zoom level");
    }
  }

  checkVisibilityChanges() {
    const now = Date.now();
    if (
      this.visibilityChangeCount > 8 &&
      now - this.lastVisibilityChange < 20000
    ) {
      this.addViolation(
        "suspicious_visibility_changes",
        "Excessive window switching detected"
      );
      this.visibilityChangeCount = 0;
    }
  }

  addViolation(type, details = "") {
    const now = Date.now();

    if (now - this.lastWarningTime < 3000) return;

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

    if (this.violations[type] >= 3) {
      this.addWarning(`${details || `Interview protocol violation: ${type}`}`);
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
        reason: "Interview terminated due to multiple protocol violations",
        warnings: this.warnings,
        violations: this.violations,
      });
    }
  }

  cleanup() {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
    }

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
