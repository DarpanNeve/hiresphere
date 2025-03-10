import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { hrApi } from "../../services/api";
import { FiUsers, FiFileText, FiLink, FiBarChart2 } from "react-icons/fi";

const HRDashboard = () => {
  const [stats, setStats] = useState({
    totalCandidates: 0,
    activeInterviews: 0,
    completedInterviews: 0,
    averageScore: 0,
    subscriptionStatus: "",
    subscriptionPlan: "",
    daysRemaining: 0,
  });

  const [recentInterviews, setRecentInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch dashboard stats
      const dashboardStats = await hrApi.getDashboardStats();

      // Fetch recent interviews
      const recentInterviewData = await hrApi.getRecentInterviews();

      // Set the data
      setStats({
        ...dashboardStats,
        subscriptionStatus: "active", // Default values since subscription endpoint is not ready
        subscriptionPlan: "trial",
        daysRemaining: 14,
      });

      setRecentInterviews(recentInterviewData.interviews || []);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError("Failed to load dashboard data. Please try again later.");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">HR Dashboard</h1>
        <div className="flex space-x-4">
          <Link
            to="/hr/interview-links"
            className="btn-outline flex items-center"
          >
            <FiLink className="mr-2" /> Create Interview Link
          </Link>
          <Link to="/hr/candidates" className="btn-primary flex items-center">
            <FiUsers className="mr-2" /> Manage Candidates
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-md mb-8">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card flex items-center p-6">
          <div className="rounded-full bg-blue-100 p-3 mr-4">
            <FiUsers className="text-blue-500 text-xl" />
          </div>
          <div>
            <p className="text-gray-600 text-sm">Total Candidates</p>
            <p className="text-2xl font-bold">{stats.totalCandidates}</p>
          </div>
        </div>

        <div className="card flex items-center p-6">
          <div className="rounded-full bg-green-100 p-3 mr-4">
            <FiBarChart2 className="text-green-500 text-xl" />
          </div>
          <div>
            <p className="text-gray-600 text-sm">Active Interviews</p>
            <p className="text-2xl font-bold">{stats.activeInterviews}</p>
          </div>
        </div>

        <div className="card flex items-center p-6">
          <div className="rounded-full bg-purple-100 p-3 mr-4">
            <FiFileText className="text-purple-500 text-xl" />
          </div>
          <div>
            <p className="text-gray-600 text-sm">Completed Interviews</p>
            <p className="text-2xl font-bold">{stats.completedInterviews}</p>
          </div>
        </div>

        <div className="card flex items-center p-6">
          <div className="rounded-full bg-yellow-100 p-3 mr-4">
            <FiBarChart2 className="text-yellow-500 text-xl" />
          </div>
          <div>
            <p className="text-gray-600 text-sm">Average Score</p>
            <p className="text-2xl font-bold">{stats.averageScore}%</p>
          </div>
        </div>
      </div>

      {/* Recent Interviews */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Recent Interviews</h2>
          <Link
            to="/hr/reports"
            className="text-primary hover:text-secondary flex items-center"
          >
            View All Reports <FiBarChart2 className="ml-1" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Candidate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scores
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentInterviews.map((interview) => (
                <tr key={interview.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">
                      {interview.candidateName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {interview.position}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {new Date(interview.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        interview.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : interview.status === "scheduled"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {interview.status || "Pending"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {interview.scores ? (
                      <div className="text-sm text-gray-500">
                        K: {interview.scores.knowledge}% | C:{" "}
                        {interview.scores.communication}% | Cf:{" "}
                        {interview.scores.confidence}%
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      to={`/hr/reports/${interview.id}`}
                      className="text-primary hover:text-secondary"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}

              {recentInterviews.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No recent interviews found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HRDashboard;
