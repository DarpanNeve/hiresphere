import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { interviewApi } from "../services/api";
import { useAuth } from "../context/AuthContext";

const Dashboard = () => {
  const [interviews, setInterviews] = useState([]);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [analysisStatus, setAnalysisStatus] = useState({});
  const [pollingInterval, setPollingInterval] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    fetchInterviews();

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [user, navigate]);

  useEffect(() => {
    // If we have a selected interview with pending analysis, start polling
    if (
      selectedInterview &&
      (selectedInterview.analysis_status === "processing" ||
        selectedInterview.analysis_status === "pending")
    ) {
      // Clear any existing interval
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }

      // Start polling for status updates
      const interval = setInterval(() => {
        checkAnalysisStatus(selectedInterview.id);
      }, 5000); // Check every 5 seconds

      setPollingInterval(interval);

      return () => clearInterval(interval);
    } else if (
      pollingInterval &&
      selectedInterview &&
      (selectedInterview.analysis_status === "completed" ||
        selectedInterview.analysis_status === "failed")
    ) {
      // Stop polling if analysis is complete or failed
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  }, [selectedInterview]);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const data = await interviewApi.getHistory();
      setInterviews(data);
      setLoading(false);
    } catch (err) {
      setError("Failed to load interviews");
      setLoading(false);
    }
  };

  const checkAnalysisStatus = async (interviewId) => {
    try {
      const status = await interviewApi.getAnalysisStatus(interviewId);
      setAnalysisStatus((prev) => ({
        ...prev,
        [interviewId]: status,
      }));

      // If analysis is complete, refresh the interview data
      if (status.analysis_status === "completed") {
        refreshInterviewData(interviewId);
      }
    } catch (err) {
      console.error("Failed to check analysis status:", err);
    }
  };

  const refreshInterviewData = async (interviewId) => {
    try {
      const data = await interviewApi.getAnalysis(interviewId);

      // Update the selected interview with fresh data
      setSelectedInterview(data);

      // Also update the interview in the list
      setInterviews((prev) =>
        prev.map((interview) =>
          interview.id === interviewId
            ? {
                ...interview,
                knowledge_score: data.knowledge_score,
                communication_score: data.communication_score,
                confidence_score: data.confidence_score,
                analysis_status: data.analysis_status,
              }
            : interview
        )
      );
    } catch (err) {
      console.error("Failed to refresh interview data:", err);
    }
  };

  const startAnalysis = async (interviewId) => {
    try {
      await interviewApi.analyzeInterview(interviewId);

      // Update the status to processing
      setAnalysisStatus((prev) => ({
        ...prev,
        [interviewId]: { analysis_status: "processing" },
      }));

      // Start polling for status updates
      checkAnalysisStatus(interviewId);
    } catch (err) {
      setError("Failed to start analysis");
    }
  };

  const renderAnalysisStatus = (interview) => {
    const status =
      analysisStatus[interview.id]?.analysis_status ||
      interview.analysis_status;

    switch (status) {
      case "completed":
        return <span className="text-green-500">Analysis complete</span>;
      case "processing":
      case "pending":
        return (
          <span className="text-blue-500 animate-pulse">Processing...</span>
        );
      case "failed":
        return <span className="text-red-500">Analysis failed</span>;
      default:
        return <span className="text-gray-500">Not analyzed</span>;
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Interview Dashboard
        </h1>
        <button onClick={() => navigate("/interview")} className="btn-primary">
          New Interview
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-md mb-8">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Interview History</h2>
            {interviews.length === 0 ? (
              <p className="text-gray-600">No interviews yet</p>
            ) : (
              <div className="space-y-2">
                {interviews.map((interview) => (
                  <button
                    key={interview.id}
                    className={`w-full text-left p-4 rounded-lg transition-colors duration-200 ${
                      selectedInterview?.id === interview.id
                        ? "bg-primary text-white"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => {
                      setSelectedInterview(interview);
                      checkAnalysisStatus(interview.id);
                    }}
                  >
                    <p className="font-semibold">
                      {new Date(interview.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-sm opacity-80">{interview.topic}</p>
                    <div className="text-xs mt-1">
                      {renderAnalysisStatus(interview)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="md:col-span-2">
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Interview Analysis</h2>
            {selectedInterview ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-lg">
                    {selectedInterview.topic}
                  </h3>
                  {selectedInterview.analysis_status !== "completed" && (
                    <button
                      onClick={() => startAnalysis(selectedInterview.id)}
                      disabled={
                        selectedInterview.analysis_status === "processing"
                      }
                      className="btn-primary text-sm py-1 px-3"
                    >
                      {selectedInterview.analysis_status === "processing"
                        ? "Processing..."
                        : "Analyze Responses"}
                    </button>
                  )}
                </div>

                {selectedInterview.analysis_status === "completed" ? (
                  <>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Knowledge Score</p>
                        <p className="text-2xl font-bold text-primary">
                          {selectedInterview.knowledge_score}%
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          Communication Score
                        </p>
                        <p className="text-2xl font-bold text-primary">
                          {selectedInterview.communication_score}%
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          Confidence Score
                        </p>
                        <p className="text-2xl font-bold text-primary">
                          {selectedInterview.confidence_score}%
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold text-gray-900">Feedback</h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-gray-700 whitespace-pre-line">
                          {selectedInterview.feedback}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    {selectedInterview.analysis_status === "processing" ? (
                      <div>
                        <p className="text-gray-600 mb-4">
                          Analysis in progress...
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div className="bg-primary h-2.5 rounded-full animate-pulse w-1/2"></div>
                        </div>
                        {analysisStatus[selectedInterview.id]
                          ?.response_counts && (
                          <p className="text-sm text-gray-500 mt-2">
                            Processed{" "}
                            {
                              analysisStatus[selectedInterview.id]
                                .response_counts.completed
                            }{" "}
                            of{" "}
                            {
                              analysisStatus[selectedInterview.id]
                                .response_counts.total
                            }{" "}
                            responses
                          </p>
                        )}
                      </div>
                    ) : selectedInterview.analysis_status === "failed" ? (
                      <p className="text-red-500">
                        Analysis failed. Please try again.
                      </p>
                    ) : (
                      <p className="text-gray-600">
                        Click "Analyze Responses" to generate feedback
                      </p>
                    )}
                  </div>
                )}

                {/* Show individual responses */}
                {selectedInterview.responses &&
                  Object.keys(selectedInterview.responses).length > 0 && (
                    <div className="mt-8">
                      <h3 className="font-semibold text-gray-900 mb-4">
                        Individual Responses
                      </h3>
                      <div className="space-y-4">
                        {Object.entries(selectedInterview.responses).map(
                          ([index, response]) => (
                            <div
                              key={index}
                              className="border border-gray-200 rounded-lg p-4"
                            >
                              <h4 className="font-medium text-gray-900 mb-2">
                                Question {parseInt(index) + 1}
                              </h4>
                              <p className="text-gray-700 mb-2 bg-gray-50 p-2 rounded">
                                {response.question}
                              </p>
                              <p className="text-gray-600 mb-4">
                                {response.response}
                              </p>

                              {response.analysis ? (
                                <div className="text-sm text-gray-500">
                                  <div className="grid grid-cols-3 gap-2 mb-2">
                                    <div>
                                      Knowledge:{" "}
                                      {response.analysis.knowledge_score}%
                                    </div>
                                    <div>
                                      Communication:{" "}
                                      {response.analysis.communication_score}%
                                    </div>
                                    <div>
                                      Confidence:{" "}
                                      {response.analysis.confidence_score}%
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500">
                                  {response.analysis_status === "pending" &&
                                    "Analysis pending"}
                                  {response.analysis_status === "failed" &&
                                    "Analysis failed"}
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
              </div>
            ) : (
              <p className="text-gray-600">
                Select an interview to view analysis
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
