import { useState, useEffect } from "react";
import { FiSearch, FiEdit2, FiTrash2, FiCheck, FiX } from "react-icons/fi";
import { adminApi } from "../../services/api";

const Subscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getAllSubscriptions();
      setSubscriptions(data);
      setLoading(false);
    } catch (err) {
      setError("Failed to load subscriptions: " + err.message);
      setLoading(false);
    }
  };

  const handleUpdateSubscription = async () => {
    try {
      if (!selectedSubscription) {
        setError("No subscription selected for editing");
        return;
      }

      const result = await adminApi.updateSubscription(
        selectedSubscription._id,
        selectedSubscription
      );
      setSubscriptions(
        subscriptions.map((sub) => (sub._id === result._id ? result : sub))
      );
      setShowEditModal(false);
      setSelectedSubscription(null);
      setError("");
    } catch (err) {
      setError("Failed to update subscription: " + err.message);
    }
  };

  const handleCancelSubscription = async (id) => {
    if (confirm("Are you sure you want to cancel this subscription?")) {
      try {
        await adminApi.cancelSubscription(id);
        setSubscriptions(
          subscriptions.map((sub) =>
            sub._id === id ? { ...sub, status: "cancelled" } : sub
          )
        );
        setError("");
      } catch (err) {
        setError("Failed to cancel subscription: " + err.message);
      }
    }
  };

  const filteredSubscriptions = subscriptions.filter(
    (sub) =>
      sub.hr_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.plan.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <h1 className="text-3xl font-bold text-gray-900">
          Subscription Management
        </h1>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-md mb-8">
          {error}
        </div>
      )}

      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">All Subscriptions</h2>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search subscriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  HR Details Continuing with the Subscriptions component table
                  headers...
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Billing
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Next Payment
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSubscriptions.map((subscription) => (
                <tr key={subscription._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">
                      {subscription.hr_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {subscription.company_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {subscription.plan.charAt(0).toUpperCase() +
                        subscription.plan.slice(1)}
                    </div>
                    <div className="text-sm text-gray-500">
                      ${subscription.amount}/month
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        subscription.status === "active"
                          ? "bg-green-100 text-green-800"
                          : subscription.status === "trial"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {subscription.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {subscription.payment_method.type === "credit_card" ? (
                        <>
                          <span className="font-medium">Card</span> ending in{" "}
                          {subscription.payment_method.last4}
                        </>
                      ) : (
                        "No payment method"
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      Last payment: ${subscription.last_payment_amount}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(
                      subscription.next_payment_date
                    ).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => {
                          setSelectedSubscription(subscription);
                          setShowEditModal(true);
                        }}
                        className="text-gray-600 hover:text-gray-900"
                        title="Edit Subscription"
                      >
                        <FiEdit2 />
                      </button>
                      {subscription.status === "active" && (
                        <button
                          onClick={() =>
                            handleCancelSubscription(subscription._id)
                          }
                          className="text-red-600 hover:text-red-900"
                          title="Cancel Subscription"
                        >
                          <FiTrash2 />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredSubscriptions.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No subscriptions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Subscription Modal */}
      {showEditModal && selectedSubscription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6">Edit Subscription</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plan
                </label>
                <select
                  value={selectedSubscription.plan}
                  onChange={(e) =>
                    setSelectedSubscription({
                      ...selectedSubscription,
                      plan: e.target.value,
                    })
                  }
                  className="input-field"
                >
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={selectedSubscription.status}
                  onChange={(e) =>
                    setSelectedSubscription({
                      ...selectedSubscription,
                      status: e.target.value,
                    })
                  }
                  className="input-field"
                >
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Next Payment Date
                </label>
                <input
                  type="date"
                  value={
                    new Date(selectedSubscription.next_payment_date)
                      .toISOString()
                      .split("T")[0]
                  }
                  onChange={(e) =>
                    setSelectedSubscription({
                      ...selectedSubscription,
                      next_payment_date: new Date(e.target.value).toISOString(),
                    })
                  }
                  className="input-field"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-8">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedSubscription(null);
                  setError("");
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateSubscription}
                className="btn-primary"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscriptions;
