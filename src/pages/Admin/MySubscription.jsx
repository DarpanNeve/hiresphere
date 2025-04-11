import { useState, useEffect } from "react";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import { subscriptionApi } from "../../services/api";
import PaymentForm from "../../components/PaymentForm";
import { FiCheck } from "react-icons/fi";

const MySubscription = () => {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansData, subscriptionData] = await Promise.all([
        subscriptionApi.getPlans(),
        subscriptionApi.getCurrentSubscription(),
      ]);
      setPlans(plansData);
      setCurrentSubscription(subscriptionData);
      setLoading(false);
    } catch (err) {
      setError("Failed to load subscription data: " + err.message);
      setLoading(false);
    }
  };

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (paymentMethod) => {
    try {
      setLoading(true);
      await subscriptionApi.purchasePlan(
        selectedPlan.id,
        paymentMethod.orderId
      );
      await fetchData();
      setShowPaymentModal(false);
      setSelectedPlan(null);
    } catch (err) {
      setError("Payment failed: " + err.message);
    } finally {
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
    <PayPalScriptProvider
      options={{
        "client-id": import.meta.env.VITE_PAYPAL_CLIENT_ID,
        currency: "USD",
        intent: "subscription",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Subscription</h1>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-md mb-8">
            {error}
          </div>
        )}

        {/* Current Subscription */}
        {currentSubscription && (
          <div className="card mb-8">
            <h2 className="text-xl font-bold mb-4">Current Subscription</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500">Plan</p>
                <p className="text-lg font-semibold">
                  {currentSubscription.plan}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="text-lg font-semibold flex items-center">
                  <span
                    className={`inline-block w-2 h-2 rounded-full mr-2 ${
                      currentSubscription.status === "active"
                        ? "bg-green-500"
                        : "bg-red-500"
                    }`}
                  ></span>
                  {currentSubscription.status}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Next Payment</p>
                <p className="text-lg font-semibold">
                  {new Date(
                    currentSubscription.next_payment_date
                  ).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Amount</p>
                <p className="text-lg font-semibold">
                  ${currentSubscription.amount}/month
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Available Plans */}
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`card relative ${
                plan.is_popular ? "border-2 border-primary" : ""
              }`}
            >
              {plan.is_popular && (
                <div className="absolute top-0 right-0 bg-primary text-white px-4 py-1 text-sm font-semibold rounded-bl-lg">
                  Most Popular
                </div>
              )}

              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <p className="text-3xl font-bold mb-4">
                ${plan.price}
                <span className="text-sm text-gray-500">/month</span>
              </p>

              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <FiCheck className="text-green-500 mt-1 mr-2 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePlanSelect(plan)}
                disabled={currentSubscription?.plan === plan.id}
                className={`w-full ${
                  currentSubscription?.plan === plan.id
                    ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                    : "btn-primary"
                }`}
              >
                {currentSubscription?.plan === plan.id
                  ? "Current Plan"
                  : "Select Plan"}
              </button>
            </div>
          ))}
        </div>

        {/* Payment Modal */}
        {showPaymentModal && selectedPlan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-6">
                Subscribe to {selectedPlan.name}
              </h2>

              <PaymentForm
                amount={selectedPlan.price}
                onSubmit={handlePaymentSubmit}
                loading={loading}
              />

              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedPlan(null);
                }}
                className="mt-4 text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </PayPalScriptProvider>
  );
};

export default MySubscription;
