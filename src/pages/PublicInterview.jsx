import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Webcam from "react-webcam";
import { FiMic, FiMicOff, FiArrowRight } from "react-icons/fi";
import { interviewApi } from "../services/api";

const PublicInterview = () => {
  const { linkId } = useParams();
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
  const [candidateInfo, setCandidateInfo] = useState({
    name: "",
    email: "",
  });
  const [showForm, setShowForm] = useState(true);

  const recognition = useRef(null);
  const webcamRef = useRef(null);

  useEffect(() => {
    validateInterviewLink();

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
    };
  }, [linkId]);

  const validateInterviewLink = async () => {
    try {
      setLoading(true);
      const linkData = await interviewApi.validateInterviewLink(linkId);

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
    if (!candidateInfo.name.trim() || !candidateInfo.email.trim()) {
      setError("Please enter your name and email to continue.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const result = await interviewApi.startPublicInterview(
        linkId,
        candidateInfo
      );

      setQuestions(result.questions);
      setCurrentQuestion(result.questions[0]);
      setResponses(new Array(result.questions.length).fill(""));
      setShowForm(false);
      setIsRecording(true);

      startListening();
    } catch (err) {
      setError(err.message || "Failed to start interview");
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

      // Save final response
      saveCurrentResponse();

      // Filter out any empty responses
      const validResponses = responses.filter(
        (r) => r && r.response && r.response.trim()
      );

      await interviewApi.completePublicInterview(linkId, {
        candidateInfo,
        responses: validResponses,
      });

      setIsRecording(false);
      setIsCompleted(true);
    } catch (err) {
      setError(err.message || "Failed to complete interview");
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
              You will receive feedback and next steps via email at{" "}
              {candidateInfo.email}.
            </p>
            <button
              onClick={() => (window.location.href = "/")}
              className="btn-primary"
            >
              Return to Home
            </button>
          </div>
        ) : showForm ? (
          <div className="card p-8 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">
              Welcome to Your Interview
            </h2>

            <p className="text-gray-600 mb-6">
              You're about to start an AI-powered interview for the{" "}
              {interviewData?.position} position at {interviewData?.company}.
            </p>

            <p className="text-gray-600 mb-6">
              <strong>Interview Topic:</strong> {interviewData?.topic}
            </p>

            {error && (
              <div className="bg-red-50 text-red-500 p-4 rounded-md mb-6">
                {error}
              </div>
            )}

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={candidateInfo.name}
                  onChange={(e) =>
                    setCandidateInfo({ ...candidateInfo, name: e.target.value })
                  }
                  className="input-field"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={candidateInfo.email}
                  onChange={(e) =>
                    setCandidateInfo({
                      ...candidateInfo,
                      email: e.target.value,
                    })
                  }
                  className="input-field"
                  placeholder="Enter your email address"
                />
              </div>
            </div>

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
