import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Webcam from "react-webcam";
import { interviewApi } from "../services/api";
import { useAuth } from "../context/AuthContext";

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
  const [videoFrames, setVideoFrames] = useState([]);
  const [microphoneAccess, setMicrophoneAccess] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const recognition = useRef(null);
  const webcamRef = useRef(null);
  const videoInterval = useRef(null);

  const initializeSpeechRecognition = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicrophoneAccess(true);

      if (window.webkitSpeechRecognition) {
        recognition.current = new window.webkitSpeechRecognition();
        recognition.current.continuous = true;
        recognition.current.interimResults = true;

        recognition.current.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map((result) => result[0].transcript)
            .join("");
          setResponses((prev) => {
            const newResponses = [...prev];
            newResponses[questionIndex] = transcript;
            return newResponses;
          });
        };

        recognition.current.onerror = (event) => {
          console.error("Speech recognition error:", event.error);
          if (event.error === "not-allowed") {
            setError(
              "Microphone access was denied. Please check your browser permissions."
            );
          } else {
            setError(`Speech recognition error: ${event.error}`);
          }
          recognition.current?.stop();
        };

        recognition.current.onend = () => {
          if (isRecording) {
            recognition.current?.start();
          }
        };
      } else {
        setError(
          "Speech recognition is not supported in your browser. Please use Chrome or Edge."
        );
      }
    } catch (err) {
      console.error("Microphone access error:", err);
      setError(
        "Failed to access microphone. Please check your browser permissions."
      );
      setMicrophoneAccess(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    initializeSpeechRecognition();

    return () => {
      if (recognition.current) {
        recognition.current.stop();
      }
      if (videoInterval.current) {
        clearInterval(videoInterval.current);
      }
    };
  }, [user, navigate]);

  const captureVideoFrame = () => {
    if (webcamRef.current) {
      const frame = webcamRef.current.getScreenshot();
      // setVideoFrames(prev => [...prev, { frame, timestamp: Date.now() }]);
    }
  };

  const handleWebcamError = (err) => {
    console.error("Webcam error:", err);
    setMediaError("Failed to access camera. Please check your permissions.");
  };

  const startInterview = async () => {
    if (!topic.trim()) {
      setError("Please enter an interview topic");
      return;
    }

    if (!microphoneAccess) {
      setError(
        "Microphone access is required to start the interview. Please grant permission and try again."
      );
      await initializeSpeechRecognition();
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

      if (recognition.current) {
        recognition.current.start();
      }

      videoInterval.current = setInterval(captureVideoFrame, 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const nextQuestion = async () => {
    if (questionIndex < questions.length - 1) {
      try {
        await submitResponse();

        setQuestionIndex((prev) => prev + 1);
        setCurrentQuestion(questions[questionIndex + 1]);
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const submitResponse = async () => {
    try {
      const responseData = {
        response: {
          questionIndex,
          question: currentQuestion,
          response: responses[questionIndex] || "",
          videoFrames,
        },
      };

      await interviewApi.submitResponse(interviewData.id, responseData);
    } catch (err) {
      throw new Error(`Failed to submit response: ${err.message}`);
    }
  };

  const endInterview = async () => {
    try {
      setLoading(true);
      if (recognition.current) {
        recognition.current.stop();
      }
      if (videoInterval.current) {
        clearInterval(videoInterval.current);
      }

      await submitResponse();

      setIsRecording(false);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          <div className="card">
            <h2 className="text-2xl font-bold mb-4">Your Response</h2>
            <p className="text-gray-600 min-h-[100px]">
              {responses[questionIndex] || ""}
            </p>
          </div>
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
                  placeholder="e.g., React Development, System Design, Data Structures"
                  className="input-field"
                />
              </div>
            )}
            {error && (
              <div className="bg-red-50 text-red-500 p-4 rounded-md mb-4">
                {error}
              </div>
            )}
            {!microphoneAccess && !isRecording && (
              <div className="bg-yellow-50 text-yellow-700 p-4 rounded-md mb-4">
                <p>Microphone access is required for the interview.</p>
                <button
                  onClick={initializeSpeechRecognition}
                  className="mt-2 text-sm font-medium underline"
                >
                  Grant Microphone Access
                </button>
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
                  disabled={loading || !microphoneAccess}
                  className="btn-primary w-full"
                >
                  {loading ? "Starting..." : "Start Interview"}
                </button>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={nextQuestion}
                    disabled={loading || questionIndex >= questions.length - 1}
                    className="btn-primary w-full"
                  >
                    Next Question
                  </button>
                  <button
                    onClick={endInterview}
                    disabled={loading}
                    className="w-full bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition-colors duration-200"
                  >
                    {loading ? "Ending..." : "End Interview"}
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
