import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Webcam from "react-webcam";
import { interviewApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useBodyLanguageAnalysis } from "../components/BodyLanguageAnalysis";
import { useInterviewMonitoring } from "../services/monitoring/useInterviewMonitoring";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import { FiMic, FiMicOff, FiArrowRight } from "react-icons/fi";

const Interview = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [interviewData, setInterviewData] = useState(null);
  const [mediaError, setMediaError] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [topic, setTopic] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [bodyLanguageData, setBodyLanguageData] = useState(null);

  const navigate = useNavigate();
  const { user } = useAuth();
  const recognition = useRef(null);
  const webcamRef = useRef(null);

  // Initialize monitoring hooks
  const bodyLanguageAnalysis = useBodyLanguageAnalysis(
    webcamRef,
    setBodyLanguageData
  );
  const monitoring = useInterviewMonitoring(webcamRef, {
    onTerminate: handleInterviewTermination,
  });

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    // Initialize speech recognition
    if (window.webkitSpeechRecognition) {
      recognition.current = new window.webkitSpeechRecognition();
      recognition.current.continuous = true;
      recognition.current.interimResults = true;

      recognition.current.onresult = (event) => {
        const currentTranscript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join("");
        setTranscript(currentTranscript);
      };

      recognition.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setError("Failed to access microphone. Please check your permissions.");
        setIsListening(false);
      };

      recognition.current.onend = () => {
        setIsListening(false);
      };
    } else {
      setError("Speech recognition is not supported in your browser.");
    }

    return () => {
      if (recognition.current && isListening) {
        recognition.current.stop();
      }
      monitoring.stopMonitoring();
      bodyLanguageAnalysis.stopAnalysis();
    };
  }, [user, navigate]);

  const handleWebcamError = (err) => {
    console.error("Webcam error:", err);
    setMediaError("Failed to access camera. Please check your permissions.");
  };

  async function handleInterviewTermination(reason) {
    setIsRecording(false);

    // Stop all analysis
    bodyLanguageAnalysis.stopAnalysis();
    monitoring.stopMonitoring();
    stopListening();

    // Only attempt to save termination if we have an active interview
    if (interviewData?.id) {
      try {
        await interviewApi.completeInterview(interviewData.id, {
          status: "terminated",
          termination_reason: reason,
        });
      } catch (error) {
        console.error("Failed to save interview termination:", error);
      }
    }

    // Show termination message
    toast.error("Interview terminated due to violations");

    // Wait a moment before redirecting
    setTimeout(() => {
      navigate("/dashboard");
    }, 3000);
  }

  const startInterview = async () => {
    if (!topic.trim()) {
      setError("Please enter an interview topic");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const result = await interviewApi.startInterview(topic);
      setInterviewData(result.interview);
      setQuestions(result.questions);
      setCurrentQuestion(result.questions[0]);
      setResponses(new Array(result.questions.length).fill(""));
      setIsRecording(true);

      // Start all monitoring systems
      await monitoring.startMonitoring();
      bodyLanguageAnalysis.startAnalysis();
      startListening();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startListening = () => {
    if (recognition.current && !isListening) {
      try {
        recognition.current.start();
        setIsListening(true);
        setTranscript("");
      } catch (error) {
        console.error("Failed to start recognition:", error);
      }
    }
  };

  const stopListening = () => {
    if (recognition.current && isListening) {
      recognition.current.stop();
      setIsListening(false);
    }
  };

  const saveCurrentResponse = () => {
    if (transcript.trim()) {
      setResponses((prev) => {
        const newResponses = [...prev];
        newResponses[questionIndex] = {
          question: currentQuestion,
          response: transcript.trim(),
        };
        return newResponses;
      });
    }
  };

  const moveToNextQuestion = () => {
    saveCurrentResponse();
    stopListening();

    if (questionIndex < questions.length - 1) {
      setQuestionIndex((prev) => prev + 1);
      setCurrentQuestion(questions[questionIndex + 1]);
      setTranscript("");

      setTimeout(() => {
        startListening();
      }, 500);
    } else {
      completeInterview();
    }
  };

  const completeInterview = async () => {
    try {
      setLoading(true);
      stopListening();

      // Stop all monitoring
      monitoring.stopMonitoring();
      bodyLanguageAnalysis.stopAnalysis();

      // Save final response
      saveCurrentResponse();

      // Mark interview as completed
      await interviewApi.completeInterview(interviewData.id);

      // Submit all responses
      const allResponses = responses
        .map((response, index) => ({
          questionIndex: index,
          response: {
            question: questions[index],
            response: response.response || transcript,
            bodyLanguage: response.bodyLanguage,
          },
        }))
        .filter((r) => r.response.response.trim());

      // Submit responses in parallel
      await Promise.all(
        allResponses.map((response) =>
          interviewApi.submitResponse(interviewData.id, response)
        )
      );

      // Start analysis in background
      await interviewApi.analyzeInterview(interviewData.id);

      setIsRecording(false);
      setIsCompleted(true);

      // Wait a moment before redirecting
      setTimeout(() => {
        navigate("/dashboard");
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderConfidenceMetrics = () => {
    if (!bodyLanguageData?.confidence) return null;

    const { overall, breakdown } = bodyLanguageData.confidence;

    return (
      <div className="card mt-4">
        <h3 className="text-lg font-semibold mb-2">
          Real-time Confidence Analysis
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span>Overall Confidence:</span>
            <span className="font-semibold">{overall}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary rounded-full h-2 transition-all duration-500"
              style={{ width: `${overall}%` }}
            ></div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="text-sm">
              <span>Eye Contact: </span>
              <span
                className={
                  breakdown.eyeContact ? "text-green-500" : "text-red-500"
                }
              >
                {breakdown.eyeContact ? "Good" : "Needs Improvement"}
              </span>
            </div>
            <div className="text-sm">
              <span>Posture: </span>
              <span
                className={
                  breakdown.posture > 0.7 ? "text-green-500" : "text-red-500"
                }
              >
                {breakdown.posture > 0.7 ? "Good" : "Needs Improvement"}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!user) return null;

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
            <div className="flex items-center mb-2">
              <div
                className={`w-3 h-3 rounded-full mr-2 ${
                  isListening ? "bg-red-500 animate-pulse" : "bg-gray-300"
                }`}
              ></div>
              <span className="text-sm text-gray-500">
                {isListening ? "Listening..." : "Microphone off"}
              </span>
            </div>
            <p className="text-gray-600 min-h-[100px]">{transcript || ""}</p>
          </div>
          {renderConfidenceMetrics()}
        </div>
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-2xl font-bold mb-4">Interview Setup</h2>
            {!isRecording && (
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
              {!isRecording ? (
                <button
                  onClick={startInterview}
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center"
                >
                  {loading ? "Starting..." : "Start Interview"}
                  {!loading && <FiArrowRight className="ml-2" />}
                </button>
              ) : (
                <div className="space-y-2">
                  {isListening ? (
                    <button
                      onClick={stopListening}
                      className="btn-outline w-full flex items-center justify-center"
                    >
                      <FiMicOff className="mr-2" /> Pause Microphone
                    </button>
                  ) : (
                    <button
                      onClick={startListening}
                      className="btn-outline w-full flex items-center justify-center"
                    >
                      <FiMic className="mr-2" /> Resume Microphone
                    </button>
                  )}
                  <button
                    onClick={moveToNextQuestion}
                    disabled={loading}
                    className="btn-primary w-full flex items-center justify-center"
                  >
                    {loading
                      ? "Processing..."
                      : questionIndex < questions.length - 1
                      ? "Next Question"
                      : "Complete Interview"}
                    {!loading && <FiArrowRight className="ml-2" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Interview;
