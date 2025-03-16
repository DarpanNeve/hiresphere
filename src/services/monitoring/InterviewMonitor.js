import * as tf from "@tensorflow/tfjs";
import * as faceDetection from "@tensorflow-models/face-detection";
import * as blazeface from "@tensorflow-models/blazeface";
import * as poseDetection from "@tensorflow-models/pose-detection";

export class InterviewMonitor {
  constructor(options = {}) {
    this.options = {
      faceCheckInterval: 1000,
      poseCheckInterval: 1000,
      tabFocusInterval: 500,
      maxWarnings: 3, // Maximum number of warnings before termination
      warningTimeout: 10000, // 10 seconds between warnings
      outOfFrameTimeout: 5000, // 5 seconds before triggering out of frame warning
      maxHeadRotation: 45, // degrees
      maxTabUnfocusTime: 3000, // milliseconds
      ...options,
    };

    this.models = {
      face: null,
      pose: null,
      blazeFace: null,
    };

    this.state = {
      isInitialized: false,
      isMonitoring: false,
      warnings: [],
      lastWarningTime: 0,
      outOfFrameStartTime: null,
      tabFocusStartTime: Date.now(),
      lastFacePosition: null,
      lastPosePosition: null,
      intervals: {
        face: null,
        pose: null,
        tabFocus: null,
      },
      violations: {
        outOfFrame: 0,
        multiplePersons: 0,
        lookingAway: 0,
        tabSwitching: 0,
      },
    };

    this.callbacks = {
      onWarning: () => {},
      onViolation: () => {},
      onTerminate: () => {},
    };
  }

  async initialize() {
    try {
      // Load face detection model
      this.models.face = await faceDetection.createDetector(
        faceDetection.SupportedModels.MediaPipeFaceDetector,
        {
          runtime: "tfjs",
          refineLandmarks: true,
          maxFaces: 1,
        }
      );

      // Load pose detection model
      this.models.pose = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
        }
      );

      // Load BlazeFace for faster initial face detection
      this.models.blazeFace = await blazeface.load();

      this.state.isInitialized = true;
      return true;
    } catch (error) {
      console.error("Failed to initialize interview monitor:", error);
      throw new Error("Failed to initialize monitoring system");
    }
  }

  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  async startMonitoring(videoElement) {
    if (!this.state.isInitialized) {
      throw new Error("Monitor not initialized");
    }

    if (!videoElement) {
      throw new Error("Video element required");
    }

    this.state.isMonitoring = true;
    this.setupTabFocusMonitoring();
    this.startFaceMonitoring(videoElement);
    this.startPoseMonitoring(videoElement);

    // Reset violation counters and warnings
    this.state.violations = {
      outOfFrame: 0,
      multiplePersons: 0,
      lookingAway: 0,
      tabSwitching: 0,
    };
    this.state.warnings = [];
  }

  stopMonitoring() {
    this.state.isMonitoring = false;
    Object.values(this.state.intervals).forEach((interval) => {
      if (interval) clearInterval(interval);
    });
    this.state.intervals = { face: null, pose: null, tabFocus: null };
  }

  setupTabFocusMonitoring() {
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    window.addEventListener("blur", this.handleWindowBlur);
    window.addEventListener("focus", this.handleWindowFocus);
    window.addEventListener("beforeunload", this.handleBeforeUnload);

    this.state.intervals.tabFocus = setInterval(() => {
      this.checkTabFocus();
    }, this.options.tabFocusInterval);
  }

  async startFaceMonitoring(videoElement) {
    this.state.intervals.face = setInterval(async () => {
      if (!this.state.isMonitoring) return;

      try {
        // Use BlazeFace first for quick detection
        const blazeFaceResult = await this.models.blazeFace.estimateFaces(
          videoElement,
          false
        );

        if (blazeFaceResult.length === 0) {
          // Confirm with MediaPipe for more accurate detection
          const faces = await this.models.face.estimateFaces(videoElement);

          if (faces.length === 0) {
            this.handleNoFaceDetected();
          } else if (faces.length > 1) {
            this.handleMultipleFaces();
          } else {
            this.analyzeFacePosition(faces[0]);
          }
        } else if (blazeFaceResult.length > 1) {
          this.handleMultipleFaces();
        } else {
          // Single face detected, proceed with detailed analysis
          const faces = await this.models.face.estimateFaces(videoElement);
          if (faces.length > 0) {
            this.analyzeFacePosition(faces[0]);
          }
        }
      } catch (error) {
        console.error("Face monitoring error:", error);
      }
    }, this.options.faceCheckInterval);
  }

  async startPoseMonitoring(videoElement) {
    this.state.intervals.pose = setInterval(async () => {
      if (!this.state.isMonitoring) return;

      try {
        const poses = await this.models.pose.estimatePoses(videoElement);

        if (poses.length > 0) {
          this.analyzePosePosition(poses[0]);
        }
      } catch (error) {
        console.error("Pose monitoring error:", error);
      }
    }, this.options.poseCheckInterval);
  }

  handleNoFaceDetected() {
    const now = Date.now();

    if (!this.state.outOfFrameStartTime) {
      this.state.outOfFrameStartTime = now;
    } else if (
      now - this.state.outOfFrameStartTime >
      this.options.outOfFrameTimeout
    ) {
      this.state.violations.outOfFrame++;
      this.triggerWarning("Face not detected in frame", "outOfFrame");
    }
  }

  handleMultipleFaces() {
    this.state.violations.multiplePersons++;
    this.triggerWarning("Multiple people detected in frame", "multiplePersons");
  }

  analyzeFacePosition(face) {
    this.state.outOfFrameStartTime = null;

    // Calculate head rotation from face landmarks
    const rotation = this.calculateHeadRotation(face.keypoints);

    if (
      Math.abs(rotation.yaw) > this.options.maxHeadRotation ||
      Math.abs(rotation.pitch) > this.options.maxHeadRotation * 0.7
    ) {
      this.state.violations.lookingAway++;
      this.triggerWarning("Looking away from screen", "lookingAway");
    }

    this.state.lastFacePosition = face;
  }

  analyzePosePosition(pose) {
    // Analyze upper body position
    const shoulderAlignment = this.calculateShoulderAlignment(pose.keypoints);
    const spineAlignment = this.calculateSpineAlignment(pose.keypoints);

    if (shoulderAlignment < 0.7 || spineAlignment < 0.7) {
      this.triggerWarning("Poor posture detected", "posture");
    }

    this.state.lastPosePosition = pose;
  }

  calculateHeadRotation(landmarks) {
    const leftEye = landmarks.find((l) => l.name === "leftEye");
    const rightEye = landmarks.find((l) => l.name === "rightEye");
    const nose = landmarks.find((l) => l.name === "noseTip");

    if (!leftEye || !rightEye || !nose) return { yaw: 0, pitch: 0 };

    const eyeDistance = Math.sqrt(
      Math.pow(rightEye.x - leftEye.x, 2) + Math.pow(rightEye.y - leftEye.y, 2)
    );

    const eyeMidpoint = {
      x: (leftEye.x + rightEye.x) / 2,
      y: (leftEye.y + rightEye.y) / 2,
    };

    const yaw =
      Math.atan2(nose.x - eyeMidpoint.x, eyeDistance) * (180 / Math.PI);
    const pitch =
      Math.atan2(nose.y - eyeMidpoint.y, eyeDistance) * (180 / Math.PI);

    return { yaw, pitch };
  }

  calculateShoulderAlignment(keypoints) {
    const leftShoulder = keypoints.find((k) => k.name === "left_shoulder");
    const rightShoulder = keypoints.find((k) => k.name === "right_shoulder");

    if (!leftShoulder || !rightShoulder) return 1;

    const heightDiff = Math.abs(leftShoulder.y - rightShoulder.y);
    return Math.max(0, 1 - heightDiff / 50);
  }

  calculateSpineAlignment(keypoints) {
    const relevantPoints = ["nose", "neck", "mid_spine", "pelvis"]
      .map((name) => keypoints.find((k) => k.name === name))
      .filter(Boolean);

    if (relevantPoints.length < 3) return 1;

    let totalAngle = 0;
    for (let i = 0; i < relevantPoints.length - 2; i++) {
      const angle = this.calculateAngle(
        relevantPoints[i],
        relevantPoints[i + 1],
        relevantPoints[i + 2]
      );
      totalAngle += Math.abs(angle - 180);
    }

    return Math.max(0, 1 - totalAngle / 180);
  }

  calculateAngle(p1, p2, p3) {
    const angle =
      Math.atan2(p3.y - p2.y, p3.x - p2.x) -
      Math.atan2(p1.y - p2.y, p1.x - p2.x);
    return ((angle * 180) / Math.PI + 360) % 360;
  }

  handleVisibilityChange = () => {
    if (document.hidden) {
      this.handleTabUnfocus();
    } else {
      this.handleTabFocus();
    }
  };

  handleWindowBlur = () => {
    this.handleTabUnfocus();
  };

  handleWindowFocus = () => {
    this.handleTabFocus();
  };

  handleBeforeUnload = (event) => {
    if (this.state.isMonitoring) {
      event.preventDefault();
      event.returnValue =
        "Are you sure you want to leave? This will terminate your interview.";
      return event.returnValue;
    }
  };

  handleTabUnfocus() {
    const now = Date.now();
    if (now - this.state.lastWarningTime > this.options.maxTabUnfocusTime) {
      this.state.violations.tabSwitching++;
      this.triggerWarning("Tab switching detected", "tabSwitching");
    }
    this.state.tabFocusStartTime = now;
  }

  handleTabFocus() {
    this.state.lastWarningTime = Date.now();
  }

  checkTabFocus() {
    const now = Date.now();
    const unfocusedTime = now - this.state.tabFocusStartTime;

    if (unfocusedTime > 5000) {
      this.state.violations.tabSwitching++;
      this.triggerWarning(
        "Extended period away from interview",
        "tabSwitching"
      );
    }
  }

  triggerWarning(reason, type) {
    const now = Date.now();

    // Check warning cooldown
    if (now - this.state.lastWarningTime < this.options.warningTimeout) {
      return;
    }

    const warning = {
      reason,
      type,
      timestamp: now,
      warningNumber: this.state.warnings.length + 1,
      violations: { ...this.state.violations },
    };

    this.state.warnings.push(warning);
    this.state.lastWarningTime = now;

    // Notify callback with remaining warnings
    if (this.callbacks.onWarning) {
      const remainingWarnings =
        this.options.maxWarnings - this.state.warnings.length;
      this.callbacks.onWarning({
        ...warning,
        remainingWarnings,
      });
    }

    // Check if max warnings reached
    if (this.state.warnings.length >= this.options.maxWarnings) {
      this.handleMaxWarningsExceeded();
    }
  }

  handleMaxWarningsExceeded() {
    if (this.callbacks.onTerminate) {
      this.callbacks.onTerminate({
        reason: "Maximum warnings exceeded",
        warnings: this.state.warnings,
        violations: this.state.violations,
      });
    }

    this.stopMonitoring();
  }

  getWarnings() {
    return this.state.warnings;
  }

  getViolations() {
    return this.state.violations;
  }

  getRemainingWarnings() {
    return Math.max(0, this.options.maxWarnings - this.state.warnings.length);
  }

  cleanup() {
    this.stopMonitoring();
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange
    );
    window.removeEventListener("blur", this.handleWindowBlur);
    window.removeEventListener("focus", this.handleWindowFocus);
    window.removeEventListener("beforeunload", this.handleBeforeUnload);
  }
}
