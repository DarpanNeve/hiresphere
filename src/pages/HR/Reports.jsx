import { useState, useEffect } from "react";
import { FiDownload, FiFilter, FiBarChart2, FiPieChart } from "react-icons/fi";
import { hrApi } from "../../services/api";

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState({
    dateRange: "30days",
    position: "all",
    status: "all",
  });
  const [stats, setStats] = useState({
    totalInterviews: 0,
    averageScores: {
      knowledge: 0,
      communication: 0,
      confidence: 0,
    },
    completionRate: 0,
    positionBreakdown: [],
  });

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const fetchReports = async () => {
    try {
      setLoading(true);

      // Fetch reports with filters
      const reportData = await hrApi.getReports(filter);

      // Fetch stats with the same filters
      const statsData = await hrApi.getReportStats(filter);

      setReports(reportData);
      setStats(statsData);

      setLoading(false);
    } catch (err) {
      setError("Failed to load reports: " + err.message);
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    // In a real implementation, this would generate and download a CSV file
    alert("Exporting reports to CSV...");
  };

  const handleFilterChange = (key, value) => {
    setFilter({
      ...filter,
      [key]: value,
    });
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
        <h1 className="text-3xl font-bold text-gray-900">Interview Reports</h1>
        <button
          onClick={handleExportCSV}
          className="btn-outline flex items-center"
        >
          <FiDownload className="mr-2" /> Export to CSV
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-md mb-8">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="card mb-8 p-4">
        <div className="flex items-center mb-4">
          <FiFilter className="text-gray-500 mr-2" />
          <h2 className="text-lg font-semibold">Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <select
              value={filter.dateRange}
              onChange={(e) => handleFilterChange("dateRange", e.target.value)}
              className="input-field"
            >
              <option value="7days">Last 7 days</option>
              <option value="30days">Last 30 days</option>
              <option value="90days">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Position
            </label>
            <select
              value={filter.position}
              onChange={(e) => handleFilterChange("position", e.target.value)}
              className="input-field"
            >
              <option value="all">All positions</option>
              <option value="frontend">Frontend Developer</option>
              <option value="backend">Backend Developer</option>
              <option value="ux">UX Designer</option>
              <option value="product">Product Manager</option>
              <option value="devops">DevOps Engineer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filter.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="input-field"
            >
              <option value="all">All statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card flex items-center p-6">
          <div className="rounded-full bg-blue-100 p-3 mr-4">
            <FiBarChart2 className="text-blue-500 text-xl" />
          </div>
          <div>
            <p className="text-gray-600 text-sm">Total Interviews</p>
            <p className="text-2xl font-bold">{stats.totalInterviews}</p>
          </div>
        </div>

        <div className="card flex items-center p-6">
          <div className="rounded-full bg-green-100 p-3 mr-4">
            <FiBarChart2 className="text-green-500 text-xl" />
          </div>
          <div>
            <p className="text-gray-600 text-sm">Avg. Knowledge Score</p>
            <p className="text-2xl font-bold">
              {stats.averageScores.knowledge}%
            </p>
          </div>
        </div>

        <div className="card flex items-center p-6">
          <div className="rounded-full bg-purple-100 p-3 mr-4">
            <FiBarChart2 className="text-purple-500 text-xl" />
          </div>
          <div>
            <p className="text-gray-600 text-sm">Avg. Communication</p>
            <p className="text-2xl font-bold">
              {stats.averageScores.communication}%
            </p>
          </div>
        </div>

        <div className="card flex items-center p-6">
          <div className="rounded-full bg-yellow-100 p-3 mr-4">
            <FiPieChart className="text-yellow-500 text-xl" />
          </div>
          <div>
            <p className="text-gray-600 text-sm">Completion Rate</p>
            <p className="text-2xl font-bold">{stats.completionRate}%</p>
          </div>
        </div>
      </div>

      {/* Position Breakdown */}
      <div className="card mb-8">
        <h2 className="text-xl font-bold mb-4">Position Breakdown</h2>
        <div className="space-y-4">
          {stats.positionBreakdown.map((item, index) => (
            <div key={index} className="flex items-center">
              <div className="w-40 text-sm text-gray-600">{item.position}</div>
              <div className="flex-1">
                <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-primary"
                    style={{
                      width: `${(item.count / stats.totalInterviews) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
              <div className="w-16 text-right text-sm font-medium">
                {item.count}
              </div>
            </div>
          ))}

          {stats.positionBreakdown.length === 0 && (
            <div className="text-center text-gray-500 py-4">
              No position data available
            </div>
          )}
        </div>
      </div>

      {/* Reports Table */}
      <div className="card">
        <h2 className="text-xl font-bold mb-6">Interview Reports</h2>

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
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Knowledge
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Communication
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.map((report) => (
                <tr key={report.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">
                      {report.candidateName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {report.position}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {new Date(report.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {report.duration} min
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span
                        className={`inline-block w-2 h-2 rounded-full mr-2 ${
                          report.scores?.knowledge >= 80
                            ? "bg-green-500"
                            : report.scores?.knowledge >= 60
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                      ></span>
                      <span className="text-gray-900">
                        {report.scores?.knowledge || "N/A"}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span
                        className={`inline-block w-2 h-2 rounded-full mr-2 ${
                          report.scores?.communication >= 80
                            ? "bg-green-500"
                            : report.scores?.communication >= 60
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                      ></span>
                      <span className="text-gray-900">
                        {report.scores?.communication || "N/A"}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span
                        className={`inline-block w-2 h-2 rounded-full mr-2 ${
                          report.scores?.confidence >= 80
                            ? "bg-green-500"
                            : report.scores?.confidence >= 60
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                      ></span>
                      <span className="text-gray-900">
                        {report.scores?.confidence || "N/A"}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <a
                      href={`/hr/reports/${report.id}`}
                      className="text-primary hover:text-secondary"
                    >
                      View Details
                    </a>
                  </td>
                </tr>
              ))}

              {reports.length === 0 && (
                <tr>
                  <td
                    colSpan="8"
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No reports found
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

export default Reports;
