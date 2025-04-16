import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Webcam from "react-webcam";
import { FiMic, FiMicOff, FiArrowRight } from "react-icons/fi";
import { interviewApi } from "../services/api";
import { useBodyLanguageAnalysis } from "../components/BodyLanguageAnalysis";
import { useInterviewMonitoring } from "../services/monitoring/useInterviewMonitoring";
import { speechService } from "../services/speech";
import toast from "react-hot-toast";

const PublicInterview = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [isRecording, setIsRecording] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [interviewData, setInterviewData] = useState(null);
  const [mediaError, setMediaError] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [showStartButton, setShowStartButton] = useState(true);

  const webcamRef = useRef(null);
  const recognizerRef = useRef(null);

  const bodyLanguageAnalysis = useBodyLanguageAnalysis(webcamRef, (data) => {
    console.log("Body language data:", data);
  });

  const monitoring = useInterviewMonitoring(webcamRef, {
    onTerminate: async (reason) => {
      await handleInterviewTermination(reason);
    },
  });

  useEffect(() => {
    validateInterviewLink();
    return () => cleanup();
  }, [token]);

  const cleanup = () => {
    if (recognizerRef.current) {
      speechService.stopContinuousRecognition(recognizerRef.current);
    }
    monitoring.stopMonitoring();
    bodyLanguageAnalysis.stopAnalysis();
  };

  const validateInterviewLink = async () => {
    try {
      setLoading(true);
      const linkData = await interviewApi.validateInterviewLink(token);

      if (!linkData.valid) {
        setError("This interview link is invalid.");
        return;
      }

      if (linkData.expired) {
        setError("This interview link has expired.");
        return;
      }

      setInterviewData(linkData);
      setLoading(false);
    } catch (err) {
      setError("Failed to validate interview link.");
      setLoading(false);
    }
  };

  const handleWebcamError = (err) => {
    console.error("Webcam error:", err);
    setMediaError("Failed to access camera. Please check your permissions.");
  };

  const startInterview = async () => {
    try {
      setLoading(true);
      setError("");

      // Initialize monitoring systems
      await Promise.all([
        monitoring.startMonitoring(),
        bodyLanguageAnalysis.startAnalysis(),
      ]);

      const result = await interviewApi.startPublicInterview(token, {
        name: interviewData.candidate_name,
        email: interviewData.candidate_email,
      });

      setQuestions(result.questions);
      setCurrentQuestion(result.questions[0]);
      setResponses(new Array(result.questions.length).fill(null));
      setShowStartButton(false);
      setIsRecording(true);

      // Start speech recognition
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

      // Read first question
      await speechService.speakText(result.questions[0]);

      setLoading(false);
    } catch (err) {
      setError(err.message || "Failed to start interview");
      setLoading(false);
    }
  };

  const handleInterviewTermination = async (reason) => {
    cleanup();
    toast.error("Interview terminated: " + reason);
    navigate("/");
  };

  const saveCurrentResponse = async () => {
    if (!transcript.trim()) return;

    setResponses((prev) => {
      const newResponses = [...prev];
      newResponses[questionIndex] = {
        question: currentQuestion,
        response: transcript.trim(),
      };
      return newResponses;
    });
  };

  const moveToNextQuestion = async () => {
    await saveCurrentResponse();

    if (questionIndex < questions.length - 1) {
      setQuestionIndex((prev) => prev + 1);
      const nextQuestion = questions[questionIndex + 1];
      setCurrentQuestion(nextQuestion);
      setTranscript("");

      // Read next question
      await speechService.speakText(nextQuestion);
    } else {
      completeInterview();
    }
  };

  const completeInterview = async () => {
    try {
      setLoading(true);
      cleanup();

      await saveCurrentResponse();

      // Filter out empty responses
      const validResponses = responses.filter(
        (r) => r && r.response && r.response.trim()
      );

      await interviewApi.completePublicInterview(token, {
        candidateInfo: {
          name: interviewData.candidate_name,
          email: interviewData.candidate_email,
        },
        responses: validResponses,
      });

      setIsCompleted(true);
      toast.success("Interview completed successfully!");

      setTimeout(() => {
        navigate("/");
      }, 3000);
    } catch (err) {
      setError(err.message || "Failed to complete interview");
      toast.error("Failed to complete interview");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !interviewData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error && !interviewData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Interview Link Error
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => (window.location.href = "/")}
              className="btn-primary"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-md py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="text-xl font-bold text-primary">AI Interviewer</div>
            {interviewData && (
              <div className="text-gray-600">
                {interviewData.position} Interview - {interviewData.company}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isCompleted ? (
          <div className="card text-center p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Interview Completed!</h2>
            <p className="text-gray-600 mb-6">
              Thank you for completing your interview. Your responses have been
              submitted and will be reviewed by the hiring team.
            </p>
            <p className="text-gray-600 mb-8">
              You will receive feedback and next steps via email.
            </p>
            <button
              onClick={() => (window.location.href = "/")}
              className="btn-primary"
            >
              Return to Home
            </button>
          </div>
        ) : showStartButton ? (
          <div className="card p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">
              Welcome to Your Interview
            </h2>

            <p className="text-gray-600 mb-6">
              You're about to start an interview for the{" "}
              {interviewData?.position} position at {interviewData?.company}.
            </p>

            <p className="text-gray-600 mb-6">
              <strong>Interview Topic:</strong> {interviewData?.topic}
            </p>

            <div className="bg-blue-50 p-4 rounded-md mb-8">
              <h3 className="font-semibold text-blue-800 mb-2">
                Before you begin:
              </h3>
              <ul className="list-disc pl-5 text-blue-700 space-y-1">
                <li>Make sure you're in a quiet environment</li>
                <li>Test your camera and microphone</li>
                <li>Have a stable internet connection</li>
                <li>The interview will take approximately 15-20 minutes</li>
                <li>You'll be asked 5 questions related to the topic</li>
              </ul>
            </div>

            <button
              onClick={startInterview}
              disabled={loading}
              className="btn-primary w-full flex justify-center items-center"
            >
              {loading ? "Starting..." : "Start Interview"}
              {!loading && <FiArrowRight className="ml-2" />}
            </button>
          </div>
        ) : (
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
                <p className="text-gray-600 min-h-[100px]">
                  {transcript || ""}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="card">
                <h2 className="text-2xl font-bold mb-4">Interview Progress</h2>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                  <div
                    className="bg-primary h-2.5 rounded-full"
                    style={{
                      width: `${
                        ((questionIndex + 1) / questions.length) * 100
                      }%`,
                    }}
                  ></div>
                </div>
                <p className="text-gray-600 mb-4">
                  Question {questionIndex + 1} of {questions.length}
                </p>

                {error && (
                  <div className="bg-red-50 text-red-500 p-4 rounded-md mb-4">
                    {error}
                  </div>
                )}
              </div>

              <div className="card">
                <h2 className="text-2xl font-bold mb-4">Current Question</h2>
                <div className="mb-4">
                  <p className="text-lg bg-gray-50 p-4 rounded-lg">
                    {currentQuestion}
                  </p>
                </div>

                <div className="space-y-4 mt-6">
                  <div className="space-y-2">
                    {isListening ? (
                      <button
                        onClick={() => setIsListening(false)}
                        className="btn-outline w-full flex items-center justify-center"
                      >
                        <FiMicOff className="mr-2" /> Pause Microphone
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsListening(true)}
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
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PublicInterview;
