import { useState, useEffect, useRef } from "react";
import * as tf from "@tensorflow/tfjs";
import * as faceLandmarksDetection from "@tensorflow-models/face-landmarks-detection";
import * as poseDetection from "@tensorflow-models/pose-detection";
import "@tensorflow/tfjs-backend-webgl";
import toast from "react-hot-toast";

export const useBodyLanguageAnalysis = (videoRef, onAnalysis) => {
  const [faceModel, setFaceModel] = useState(null);
  const [poseModel, setPoseModel] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const intervalIdRef = useRef(null);

  useEffect(() => {
    loadModels();
    return () => {
      stopAnalysis();
    };
  }, []);

  const loadModels = async () => {
    try {
      toast.loading("Loading analysis models...");
      // Ensure TensorFlow backend is initialized
      await tf.setBackend("webgl");

      // Load face landmarks detection model
      const faceDetector = await faceLandmarksDetection.createDetector(
        faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
        {
          runtime: "tfjs",
          refineLandmarks: true,
          maxFaces: 1,
        }
      );
      setFaceModel(faceDetector);

      // Load pose detection model
      const poseDetector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
        }
      );
      setPoseModel(poseDetector);

      toast.dismiss();
      toast.success("Analysis models loaded successfully");
    } catch (error) {
      console.error("Error loading models:", error);
      toast.dismiss();
      toast.error("Failed to load analysis models");
    }
  };

  const startAnalysis = () => {
    if (!faceModel || !poseModel || !videoRef.current) {
      toast.error("Analysis models not ready. Please wait.");
      return;
    }
    setIsAnalyzing(true);

    intervalIdRef.current = setInterval(async () => {
      const analysis = await analyzeFrame();
      if (analysis) {
        onAnalysis(analysis);
      }
    }, 1000);
  };

  const stopAnalysis = () => {
    setIsAnalyzing(false);
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  };

  const analyzeFrame = async () => {
    if (!videoRef.current || !faceModel || !poseModel) return null;
    try {
      // Get video frame from react-webcam component
      const video = videoRef.current.video;
      if (!video) return null;

      // Analyze face landmarks
      const faces = await faceModel.estimateFaces(video);
      const face = faces[0]; // analyze only the first face

      // Analyze pose
      const poses = await poseModel.estimatePoses(video);
      const pose = poses[0]; // analyze only the first person

      if (!face || !pose) return null;

      // Analyze facial expressions and posture
      const expressions = analyzeFacialExpressions(face);
      const posture = analyzePosture(pose);
      const confidenceMetrics = calculateConfidenceMetrics(
        expressions,
        posture
      );

      return {
        timestamp: new Date().toISOString(),
        expressions,
        posture,
        confidence: confidenceMetrics,
      };
    } catch (error) {
      console.error("Error analyzing frame:", error);
      toast.error("Error analyzing body language");
      return null;
    }
  };

  const analyzeFacialExpressions = (face) => {
    const landmarks = face.keypoints;
    const eyeOpenness = calculateEyeOpenness(landmarks);
    const mouthMovement = calculateMouthMovement(landmarks);
    const browPosition = calculateBrowPosition(landmarks);
    return {
      smiling: mouthMovement > 0.6,
      eyeContact: eyeOpenness > 0.7,
      engagement: (eyeOpenness + mouthMovement + browPosition) / 3,
      tension: browPosition < 0.3,
    };
  };

  const analyzePosture = (pose) => {
    const keypoints = pose.keypoints;
    const shoulderAlignment = calculateShoulderAlignment(keypoints);
    const headPosition = calculateHeadPosition(keypoints);
    const spineAlignment = calculateSpineAlignment(keypoints);
    return {
      upright: spineAlignment > 0.8,
      relaxed: shoulderAlignment > 0.7,
      attentive: headPosition > 0.6,
      overall: (spineAlignment + shoulderAlignment + headPosition) / 3,
    };
  };

  const calculateConfidenceMetrics = (expressions, posture) => {
    const weights = {
      eyeContact: 0.3,
      posture: 0.2,
      engagement: 0.3,
      relaxation: 0.2,
    };
    const metrics = {
      eyeContact: expressions.eyeContact ? 1 : 0,
      posture: posture.upright ? 1 : 0.5,
      engagement: expressions.engagement,
      relaxation: posture.relaxed ? 1 : 0.5,
    };
    const overallConfidence = Object.keys(weights).reduce((sum, key) => {
      return sum + weights[key] * metrics[key];
    }, 0);
    return {
      overall: Math.round(overallConfidence * 100),
      breakdown: metrics,
    };
  };

  const calculateEyeOpenness = (landmarks) => {
    const leftEye = landmarks.filter((l) => l.name?.includes("leftEye"));
    const rightEye = landmarks.filter((l) => l.name?.includes("rightEye"));
    if (leftEye.length === 0 || rightEye.length === 0) return 0.5;
    const leftOpening = calculateEyeOpening(leftEye);
    const rightOpening = calculateEyeOpening(rightEye);
    return (leftOpening + rightOpening) / 2;
  };

  const calculateEyeOpening = (eyePoints) => {
    const upperPoints = eyePoints.filter((p) => p.name?.includes("upper"));
    const lowerPoints = eyePoints.filter((p) => p.name?.includes("lower"));
    if (upperPoints.length === 0 || lowerPoints.length === 0) return 0.5;
    const avgUpper = averagePosition(upperPoints);
    const avgLower = averagePosition(lowerPoints);
    return Math.min(1, Math.max(0, avgLower.y - avgUpper.y));
  };

  const calculateMouthMovement = (landmarks) => {
    const upperLip = landmarks.filter((l) => l.name?.includes("upperLip"));
    const lowerLip = landmarks.filter((l) => l.name?.includes("lowerLip"));
    if (upperLip.length === 0 || lowerLip.length === 0) return 0.5;
    const avgUpper = averagePosition(upperLip);
    const avgLower = averagePosition(lowerLip);
    return Math.min(1, Math.max(0, avgLower.y - avgUpper.y));
  };

  const calculateBrowPosition = (landmarks) => {
    const brows = landmarks.filter((l) => l.name?.includes("eyebrow"));
    const eyes = landmarks.filter((l) => l.name?.includes("eye"));
    if (brows.length === 0 || eyes.length === 0) return 0.5;
    const avgBrow = averagePosition(brows);
    const avgEye = averagePosition(eyes);
    return Math.min(1, Math.max(0, avgBrow.y - avgEye.y));
  };

  const calculateShoulderAlignment = (keypoints) => {
    const leftShoulder = keypoints.find((k) => k.name === "left_shoulder");
    const rightShoulder = keypoints.find((k) => k.name === "right_shoulder");
    if (!leftShoulder || !rightShoulder) return 0.5;
    const heightDiff = Math.abs(leftShoulder.y - rightShoulder.y);
    return Math.max(0, 1 - heightDiff);
  };

  const calculateHeadPosition = (keypoints) => {
    const nose = keypoints.find((k) => k.name === "nose");
    const neck = keypoints.find((k) => k.name === "neck");
    if (!nose || !neck) return 0.5;
    const angle = Math.atan2(nose.y - neck.y, nose.x - neck.x);
    return Math.max(0, 1 - Math.abs(angle));
  };

  const calculateSpineAlignment = (keypoints) => {
    const relevantPoints = ["neck", "mid_spine", "pelvis"].map((name) =>
      keypoints.find((k) => k.name === name)
    );
    if (relevantPoints.some((p) => !p)) return 0.5;
    const angles = [];
    for (let i = 0; i < relevantPoints.length - 1; i++) {
      const angle = Math.atan2(
        relevantPoints[i + 1].y - relevantPoints[i].y,
        relevantPoints[i + 1].x - relevantPoints[i].x
      );
      angles.push(angle);
    }
    const angleVariation = Math.max(...angles) - Math.min(...angles);
    return Math.max(0, 1 - angleVariation);
  };

  const averagePosition = (points) => {
    const sum = points.reduce(
      (acc, p) => ({
        x: acc.x + p.x,
        y: acc.y + p.y,
      }),
      { x: 0, y: 0 }
    );
    return {
      x: sum.x / points.length,
      y: sum.y / points.length,
    };
  };

  return {
    startAnalysis,
    stopAnalysis,
    isAnalyzing,
  };
};

export default useBodyLanguageAnalysis;
