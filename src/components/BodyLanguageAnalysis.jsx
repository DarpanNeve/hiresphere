import { useState, useEffect } from "react";
import * as tf from "@tensorflow/tfjs";
import * as blazeface from "@tensorflow-models/blazeface";
import * as poseDetection from "@tensorflow-models/pose-detection";
import toast from "react-hot-toast";

export const useBodyLanguageAnalysis = (videoRef, onAnalysis) => {
  const [faceModel, setFaceModel] = useState(null);
  const [poseModel, setPoseModel] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    loadModels();
    return () => {
      stopAnalysis();
    };
  }, []);

  const loadModels = async () => {
    try {
      toast.loading("Loading analysis models...");

      // Initialize TensorFlow.js
      await tf.ready();

      // Load BlazeFace model with more lenient settings
      const blazeFaceModel = await blazeface.load({
        maxFaces: 1,
        inputWidth: 128,
        inputHeight: 128,
        iouThreshold: 0.3,
        scoreThreshold: 0.5,
      });
      setFaceModel(blazeFaceModel);

      // Load pose detection model with optimized settings
      const poseDetector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          enableSmoothing: true,
          minPoseScore: 0.25,
          multiPoseMaxDimension: 256,
        }
      );
      setPoseModel(poseDetector);

      toast.dismiss();
      toast.success("Analysis models loaded successfully");
    } catch (error) {
      console.error("Error loading models:", error);
      toast.dismiss();
      toast.error("Failed to load analysis models");
      throw new Error("Failed to initialize face detection");
    }
  };
  const initializeFaceDetection = async () => {
    if (faceModel) return; // Already initialized

    try {
      // Load BlazeFace model with more lenient settings
      const blazeFaceModel = await blazeface.load({
        maxFaces: 1,
        inputWidth: 128,
        inputHeight: 128,
        iouThreshold: 0.3,
        scoreThreshold: 0.5,
      });
      setFaceModel(blazeFaceModel);
      return blazeFaceModel;
    } catch (error) {
      console.error("Error initializing face detection:", error);
      throw new Error("Failed to initialize face detection");
    }
  };

  const initializePoseDetection = async () => {
    try {
      // Initialize TensorFlow.js if not already done
      await tf.ready();

      // Load pose detection model with optimized settings
      const poseDetector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          enableSmoothing: true,
          minPoseScore: 0.25,
          multiPoseMaxDimension: 256,
        }
      );

      setPoseModel(poseDetector);
      console.log("Pose detection model loaded successfully");
      return poseDetector;
    } catch (error) {
      console.error("Error initializing pose detection:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      throw new Error("Failed to initialize pose detection");
    }
  };

  const startAnalysis = () => {
    if (!faceModel || !poseModel || !videoRef.current) {
      toast.error("Analysis models not ready. Please wait.");
      return;
    }
    setIsAnalyzing(true);

    const interval = setInterval(async () => {
      const analysis = await analyzeFrame();
      if (analysis) {
        onAnalysis(analysis);
      }
    }, 1000);

    return () => clearInterval(interval);
  };

  const stopAnalysis = () => {
    setIsAnalyzing(false);
  };

  const analyzeFrame = async () => {
    if (!videoRef.current || !faceModel || !poseModel) return null;

    try {
      // Get video frame
      const video = videoRef.current.video;
      if (!video) return null;

      // Analyze face using BlazeFace
      const faces = await faceModel.estimateFaces(video, false);
      const face = faces[0]; // We only analyze the first face

      // Analyze pose
      const poses = await poseModel.estimatePoses(video);
      const pose = poses[0]; // We only analyze the first person

      if (!face || !pose) return null;

      // Analyze facial expressions
      const expressions = analyzeFacialExpressions(face);

      // Analyze posture
      const posture = analyzePosture(pose);

      // Calculate confidence metrics
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
      return null;
    }
  };

  const analyzeFacialExpressions = (face) => {
    // Calculate facial metrics using BlazeFace landmarks
    const landmarks = face.landmarks;
    const probability = face.probability;

    return {
      attentive: probability > 0.8,
      engagement: probability,
      eyeContact: probability > 0.7,
    };
  };

  const analyzePosture = (pose) => {
    if (!pose.keypoints)
      return {
        upright: true,
        relaxed: true,
        attentive: true,
        overall: 1,
      };

    const keypoints = pose.keypoints;

    // Basic posture analysis from pose keypoints
    const shoulderAlignment = calculateShoulderAlignment(keypoints);
    const spineAlignment = calculateSpineAlignment(keypoints);

    return {
      upright: spineAlignment > 0.7,
      relaxed: shoulderAlignment > 0.7,
      attentive: (spineAlignment + shoulderAlignment) / 2 > 0.7,
      overall: (spineAlignment + shoulderAlignment) / 2,
    };
  };

  const calculateShoulderAlignment = (keypoints) => {
    const leftShoulder = keypoints.find((k) => k.name === "left_shoulder");
    const rightShoulder = keypoints.find((k) => k.name === "right_shoulder");

    if (!leftShoulder || !rightShoulder) return 1;

    const heightDiff = Math.abs(leftShoulder.y - rightShoulder.y);
    return Math.max(0, 1 - heightDiff / 100);
  };

  const calculateSpineAlignment = (keypoints) => {
    const nose = keypoints.find((k) => k.name === "nose");
    const shoulder = keypoints.find((k) => k.name === "left_shoulder");
    const hip = keypoints.find((k) => k.name === "left_hip");

    if (!nose || !shoulder || !hip) return 1;

    const angle = Math.abs(
      Math.atan2(hip.y - shoulder.y, hip.x - shoulder.x) -
        Math.atan2(shoulder.y - nose.y, shoulder.x - nose.x)
    );

    return Math.max(0, 1 - angle / Math.PI);
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

  return {
    startAnalysis,
    stopAnalysis,
    isAnalyzing,
    initializeFaceDetection,
    initializePoseDetection,
  };
};

export default useBodyLanguageAnalysis;
