import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Webcam from "react-webcam";
import { interviewApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useBodyLanguageAnalysis } from "../components/BodyLanguageAnalysis";
import { useInterviewMonitoring } from "../services/monitoring/useInterviewMonitoring";
import { speechService } from "../services/speech";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import {
  FiArrowRight,
  FiLoader,
  FiMic,
  FiVideo,
  FiShield,
} from "react-icons/fi";

const ANSWER_TIME_LIMIT = 60;

const Interview = () => {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);
  const [error, setError] = useState("");
  const [interviewData, setInterviewData] = useState(null);
  const [mediaError, setMediaError] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [topic, setTopic] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(ANSWER_TIME_LIMIT);
  const [isAnswering, setIsAnswering] = useState(false);
  const [bodyLanguageData, setBodyLanguageData] = useState(null);
  const [monitoringInitialized, setMonitoringInitialized] = useState(false);

  const [systemChecks, setSystemChecks] = useState({
    camera: { status: "pending", message: "Checking camera access..." },
    microphone: { status: "pending", message: "Checking microphone access..." },
    faceDetection: { status: "pending", message: "Loading face detection..." },
    poseDetection: { status: "pending", message: "Loading pose detection..." },
    antiCheat: { status: "pending", message: "Initializing security..." },
  });
  const [allChecksComplete, setAllChecksComplete] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();
  const webcamRef = useRef(null);
  const recognizerRef = useRef(null);
  const timerRef = useRef(null);

  const bodyLanguageAnalysis = useBodyLanguageAnalysis(
    webcamRef,
    setBodyLanguageData
  );

  const monitoring = useInterviewMonitoring(webcamRef, {
    maxWarnings: 3,
    warningTimeout: 3000,
    outOfFrameTimeout: 1500,
    maxHeadRotation: 25,
    maxTabUnfocusTime: 500,
    debug: true,
    onTerminate: handleInterviewTermination,
  });

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    initializeSystems();

    if (webcamRef.current?.video) {
      webcamRef.current.video.disablePictureInPicture = true;
    }

    window.onbeforeunload = (e) => {
      if (!isCompleted) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    return () => {
      cleanup();
      window.onbeforeunload = null;
    };
  }, [user, navigate]);

  const initializeSystems = async () => {
    try {
      await checkCamera();
      await checkMicrophone();
      await initializeFaceDetection();
      await initializePoseDetection();
      await initializeAntiCheat();

      setAllChecksComplete(true);
      setModelLoading(false);
    } catch (error) {
      console.error("System initialization failed:", error);
      toast.error("Failed to initialize interview systems");
    }
  };

  const checkCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      setSystemChecks((prev) => ({
        ...prev,
        camera: { status: "success", message: "Camera access granted" },
      }));
    } catch (error) {
      setSystemChecks((prev) => ({
        ...prev,
        camera: { status: "error", message: "Camera access denied" },
      }));
      throw new Error("Camera access required");
    }
  };

  const checkMicrophone = async () => {
    try {
      const hasAccess = await speechService.checkMicrophonePermission();
      if (!hasAccess) throw new Error("Microphone permission denied");
      setSystemChecks((prev) => ({
        ...prev,
        microphone: { status: "success", message: "Microphone access granted" },
      }));
    } catch (error) {
      setSystemChecks((prev) => ({
        ...prev,
        microphone: { status: "error", message: "Microphone access denied" },
      }));
      throw new Error("Microphone access required");
    }
  };

  const initializeFaceDetection = async () => {
    try {
      await bodyLanguageAnalysis.initializeFaceDetection();
      setSystemChecks((prev) => ({
        ...prev,
        faceDetection: { status: "success", message: "Face detection ready" },
      }));
    } catch (error) {
      setSystemChecks((prev) => ({
        ...prev,
        faceDetection: {
          status: "error",
          message: "Face detection failed to load",
        },
      }));
      throw new Error("Face detection initialization failed");
    }
  };

  const initializePoseDetection = async () => {
    try {
      await bodyLanguageAnalysis.initializePoseDetection();
      setSystemChecks((prev) => ({
        ...prev,
        poseDetection: { status: "success", message: "Pose detection ready" },
      }));
    } catch (error) {
      setSystemChecks((prev) => ({
        ...prev,
        poseDetection: {
          status: "error",
          message: "Pose detection failed to load",
        },
      }));
      throw new Error("Pose detection initialization failed");
    }
  };

  const initializeAntiCheat = async () => {
    try {
      const initialized = await monitoring.initialize();
      if (!initialized) {
        throw new Error("Failed to initialize monitoring system");
      }
      setMonitoringInitialized(true);
      setSystemChecks((prev) => ({
        ...prev,
        antiCheat: { status: "success", message: "Security systems ready" },
      }));
    } catch (error) {
      setSystemChecks((prev) => ({
        ...prev,
        antiCheat: {
          status: "error",
          message: "Security initialization failed",
        },
      }));
      throw new Error("Anti-cheat initialization failed");
    }
  };

  useEffect(() => {
    if (isAnswering) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            moveToNextQuestion();
            return ANSWER_TIME_LIMIT;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [isAnswering]);

  const cleanup = () => {
    if (recognizerRef.current) {
      speechService.stopContinuousRecognition(recognizerRef.current);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    monitoring.stopMonitoring();
    bodyLanguageAnalysis.stopAnalysis();
  };

  const handleWebcamError = (err) => {
    console.error("Webcam error:", err);
    setMediaError("Failed to access camera. Please check your permissions.");
  };

  async function handleInterviewTermination(reason) {
    cleanup();

    if (interviewData?.id) {
      try {
        await interviewApi.completeInterview(interviewData.id);
      } catch (error) {
        console.error("Failed to save interview termination:", error);
      }
    }

    toast.error("Interview terminated due to security violations", {
      duration: 7000,
      position: "top-center",
      style: {
        background: "#fee2e2",
        color: "#dc2626",
        fontWeight: "bold",
        fontSize: "1.1em",
      },
      icon: "🚫",
    });

    setTimeout(() => {
      navigate("/dashboard");
    }, 2000);
  }

  const startInterview = async () => {
    if (!topic.trim()) {
      setError("Please enter an interview topic");
      return;
    }

    if (modelLoading) {
      setError("Please wait for the interview systems to initialize");
      return;
    }

    try {
      setLoading(true);
      setError("");

      if (!monitoring.isMonitoring && monitoringInitialized) {
        console.log("Starting interview monitoring...");
        const monitoringStarted = await monitoring.startMonitoring();
        if (!monitoringStarted) {
          throw new Error("Failed to start interview monitoring");
        }
        console.log("Interview monitoring started successfully");
      }

      const result = await interviewApi.startInterview(topic);
      setInterviewData(result.interview);
      setQuestions(result.questions);
      setCurrentQuestion(result.questions[0]);
      setResponses(new Array(result.questions.length).fill(null));

      await new Promise((resolve) => setTimeout(resolve, 500));

      await readQuestion(result.questions[0]);

      recognizerRef.current = speechService.startContinuousRecognition(
        (interimText) => {
          if (!speechService.isCurrentlySpeaking()) {
            setTranscript((prev) => prev + " " + interimText);
          }
        },
        (finalText) => {
          if (!speechService.isCurrentlySpeaking()) {
            setTranscript((prev) => prev + " " + finalText);
          }
        }
      );

      setIsAnswering(true);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const readQuestion = async (question) => {
    try {
      if (recognizerRef.current) {
        speechService.stopContinuousRecognition(recognizerRef.current);
      }

      await speechService.speakText(question);

      if (!isCompleted) {
        recognizerRef.current = speechService.startContinuousRecognition(
          (interimText) => {
            if (!speechService.isCurrentlySpeaking()) {
              setTranscript((prev) => prev + " " + interimText);
            }
          },
          (finalText) => {
            if (!speechService.isCurrentlySpeaking()) {
              setTranscript((prev) => prev + " " + finalText);
            }
          }
        );
      }
    } catch (error) {
      console.error("Failed to read question:", error);
      toast.error("Failed to read question");
    }
  };

  const saveCurrentResponse = async () => {
    if (!transcript.trim()) return;

    try {
      const newResponses = [...responses];
      newResponses[questionIndex] = {
        question: currentQuestion,
        response: transcript.trim(),
      };
      setResponses(newResponses);

      if (interviewData?.id) {
        await interviewApi.submitResponse(interviewData.id, {
          questionIndex,
          response: {
            question: currentQuestion,
            response: transcript.trim(),
          },
        });

        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error("Failed to save response:", error);
      toast.error("Failed to save response");
    }
  };

  const moveToNextQuestion = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setIsAnswering(false);
    setTimeRemaining(ANSWER_TIME_LIMIT);

    await saveCurrentResponse();

    if (questionIndex < questions.length - 1) {
      setQuestionIndex((prev) => prev + 1);
      const nextQuestion = questions[questionIndex + 1];
      setCurrentQuestion(nextQuestion);
      setTranscript("");

      await readQuestion(nextQuestion);
      setIsAnswering(true);
    } else {
      completeInterview();
    }
  };

  const completeInterview = async () => {
    try {
      setLoading(true);
      cleanup();

      await saveCurrentResponse();

      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (interviewData?.id) {
        await interviewApi.completeInterview(interviewData.id);

        await new Promise((resolve) => setTimeout(resolve, 1000));

        await interviewApi.analyzeInterview(interviewData.id);
      }

      setIsCompleted(true);
      toast.success("Interview completed successfully!");

      setTimeout(() => {
        navigate("/dashboard");
      }, 3000);
    } catch (err) {
      setError(err.message);
      toast.error("Failed to complete interview");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    return `${Math.floor(seconds / 60)}:${(seconds % 60)
      .toString()
      .padStart(2, "0")}`;
  };

  if (!user) return null;

  if (!allChecksComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-center mb-8">
            Initializing Interview Systems
          </h2>

          <div className="space-y-6">
            {Object.entries(systemChecks).map(([key, check]) => (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center">
                  {key === "camera" && <FiVideo className="mr-3" />}
                  {key === "microphone" && <FiMic className="mr-3" />}
                  {key === "antiCheat" && <FiShield className="mr-3" />}
                  <span className="capitalize">{check.message}</span>
                </div>
                <div className="flex items-center">
                  {check.status === "pending" && (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                  )}
                  {check.status === "success" && (
                    <div className="text-green-500">✓</div>
                  )}
                  {check.status === "error" && (
                    <div className="text-red-500">✗</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {Object.values(systemChecks).some(
            (check) => check.status === "error"
          ) && (
            <div className="mt-8 text-center">
              <p className="text-red-500 mb-4">
                Some required systems failed to initialize. Please ensure:
              </p>
              <ul className="text-left text-sm text-gray-600 space-y-2">
                <li>• Camera and microphone permissions are granted</li>
                <li>
                  • You are using a supported browser (Chrome recommended)
                </li>
                <li>• Your internet connection is stable</li>
              </ul>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 btn-primary"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (monitoring.isTerminated) {
    return (
      <div className="card text-center p-8">
        <h2 className="text-2xl font-bold mb-4 text-red-600">
          Interview Terminated
        </h2>
        <p className="text-gray-600 mb-4">
          Your interview has been terminated due to detected violations of the
          interview rules. Multiple warnings were issued before termination.
        </p>
        <div className="bg-red-50 p-4 rounded-lg mb-4">
          <h3 className="font-semibold mb-2">Warnings Received:</h3>
          <ul className="text-left list-disc pl-4">
            {monitoring.warnings.map((warning, index) => (
              <li key={index} className="text-red-600">
                {warning.reason} -{" "}
                {new Date(warning.timestamp).toLocaleTimeString()}
              </li>
            ))}
          </ul>
        </div>
        <button onClick={() => navigate("/dashboard")} className="btn-primary">
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="card text-center p-8">
        <h2 className="text-2xl font-bold mb-4">Interview Completed!</h2>
        <p className="text-gray-600 mb-4">
          Your responses have been submitted and are being analyzed. You will be
          redirected to the dashboard shortly.
        </p>
        <div className="animate-pulse text-primary">Processing...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Toaster position="top-right" />

      {modelLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 text-center">
            <FiLoader className="animate-spin h-8 w-8 mx-auto mb-4 text-primary" />
            <p className="text-lg font-semibold">
              Initializing Interview Systems
            </p>
            <p className="text-gray-600 mt-2">Please wait...</p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-2xl font-bold mb-4">Your Camera</h2>
            {mediaError ? (
              <div className="bg-red-50 text-red-500 p-4 rounded-md">
                {mediaError}
              </div>
            ) : (
              <Webcam
                ref={webcamRef}
                audio={false}
                className="w-full rounded-lg"
                mirrored={true}
                screenshotFormat="image/jpeg"
                onUserMediaError={handleWebcamError}
              />
            )}
          </div>

          {monitoring.warnings.length > 0 && (
            <div className="card bg-red-50">
              <h3 className="text-lg font-semibold text-red-600 mb-2">
                Warnings
              </h3>
              <ul className="space-y-2">
                {monitoring.warnings.map((warning, index) => (
                  <li key={index} className="text-red-600 text-sm">
                    {warning.reason} -{" "}
                    {new Date(warning.timestamp).toLocaleTimeString()}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card">
            <h2 className="text-2xl font-bold mb-4">Your Response</h2>
            {isAnswering && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500">Time Remaining</span>
                  <span
                    className={`font-mono ${
                      timeRemaining <= 30 ? "text-red-500" : "text-gray-700"
                    }`}
                  >
                    {formatTime(timeRemaining)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-1000"
                    style={{
                      width: `${(timeRemaining / ANSWER_TIME_LIMIT) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            )}
            <div className="relative">
              <div className="absolute top-2 right-2">
                {isAnswering && (
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></div>
                    <span className="text-sm text-gray-500">Recording</span>
                  </div>
                )}
              </div>
              <p className="text-gray-600 min-h-[100px] p-4 bg-gray-50 rounded-lg">
                {transcript || "Your response will appear here..."}
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-2xl font-bold mb-4">Interview Setup</h2>
            {!currentQuestion && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interview Topic
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., React Development, System Design"
                  className="input-field"
                />
              </div>
            )}
            {error && (
              <div className="bg-red-50 text-red-500 p-4 rounded-md mb-4">
                {error}
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="text-2xl font-bold mb-4">Current Question</h2>
            {currentQuestion ? (
              <div className="mb-4">
                <h3 className="font-semibold text-gray-700 mb-2">
                  Question {questionIndex + 1} of {questions.length}
                </h3>
                <p className="text-lg bg-gray-50 p-4 rounded-lg">
                  {currentQuestion}
                </p>
              </div>
            ) : (
              <p className="text-gray-600">
                Start the interview to see questions
              </p>
            )}

            <div className="space-y-4 mt-6">
              {!currentQuestion ? (
                <button
                  onClick={startInterview}
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center"
                >
                  {loading ? "Starting..." : "Start Interview"}
                  {!loading && <FiArrowRight className="ml-2" />}
                </button>
              ) : (
                <button
                  onClick={moveToNextQuestion}
                  disabled={loading || !isAnswering}
                  className="btn-primary w-full flex items-center justify-center"
                >
                  {loading
                    ? "Processing..."
                    : questionIndex < questions.length - 1
                    ? "Next Question"
                    : "Complete Interview"}
                  {!loading && <FiArrowRight className="ml-2" />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Interview;
