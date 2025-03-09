import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../services/api";
import { FiUsers, FiUserPlus, FiDollarSign, FiSettings } from "react-icons/fi";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalHR: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getDashboardStats();
      setStats(data);
      setLoading(false);
    } catch (err) {
      setError("Failed to load dashboard stats: " + err.message);
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
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-md mb-8">
          {error}
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Link
          to="/admin/hr-management"
          className="card hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center p-6">
            <div className="rounded-full bg-blue-100 p-3 mr-4">
              <FiUsers className="text-blue-500 text-xl" />
            </div>
            <div>
              <p className="text-gray-600 text-sm">HR Management</p>
              <p className="text-2xl font-bold">{stats.totalHR}</p>
            </div>
          </div>
        </Link>

        <Link
          to="/admin/subscriptions"
          className="card hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center p-6">
            <div className="rounded-full bg-green-100 p-3 mr-4">
              <FiDollarSign className="text-green-500 text-xl" />
            </div>
            <div>
              <p className="text-gray-600 text-sm">Active Subscriptions</p>
              <p className="text-2xl font-bold">{stats.activeSubscriptions}</p>
            </div>
          </div>
        </Link>

        <div className="card">
          <div className="flex items-center p-6">
            <div className="rounded-full bg-purple-100 p-3 mr-4">
              <FiDollarSign className="text-purple-500 text-xl" />
            </div>
            <div>
              <p className="text-gray-600 text-sm">Total Revenue</p>
              <p className="text-2xl font-bold">${stats.totalRevenue}</p>
            </div>
          </div>
        </div>

        <Link
          to="/admin/settings"
          className="card hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center p-6">
            <div className="rounded-full bg-gray-100 p-3 mr-4">
              <FiSettings className="text-gray-500 text-xl" />
            </div>
            <div>
              <p className="text-gray-600 text-sm">Settings</p>
              <p className="text-sm text-gray-500">System Configuration</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h2 className="text-xl font-bold mb-6">Recent Activity</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  HR Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.recentActivity.map((activity, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(activity.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {activity.hrName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {activity.hrEmail}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        activity.action === "subscription_updated"
                          ? "bg-green-100 text-green-800"
                          : activity.action === "subscription_cancelled"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {activity.action.replace("_", " ").toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {activity.details}
                  </td>
                </tr>
              ))}

              {stats.recentActivity.length === 0 && (
                <tr>
                  <td
                    colSpan="4"
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No recent activity
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

export default AdminDashboard;
