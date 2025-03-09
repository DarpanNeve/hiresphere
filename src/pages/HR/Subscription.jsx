import { useState, useEffect } from "react";
import { FiCheck, FiX, FiCreditCard } from "react-icons/fi";
import { hrApi } from "../../services/api";

const Subscription = () => {
  const [subscription, setSubscription] = useState({
    plan: "",
    status: "",
    nextBillingDate: "",
    paymentMethod: {
      type: "",
      last4: "",
      expiryMonth: 0,
      expiryYear: 0,
    },
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [paymentData, setPaymentData] = useState({
    type: "credit_card",
    card_number: "",
    expiry_month: "",
    expiry_year: "",
    cvc: "",
    cardholder_name: "",
  });

  const plans = [
    {
      id: "starter",
      name: "Starter",
      price: 49,
      features: [
        "10 interview links per month",
        "Basic analytics",
        "Email support",
        "1 HR account",
      ],
      notIncluded: [
        "Custom interview topics",
        "Advanced analytics",
        "Priority support",
        "Multiple HR accounts",
      ],
    },
    {
      id: "professional",
      name: "Professional",
      price: 99,
      popular: true,
      features: [
        "50 interview links per month",
        "Custom interview topics",
        "Advanced analytics",
        "Priority email support",
        "Up to 3 HR accounts",
      ],
      notIncluded: [
        "White-label solution",
        "API access",
        "Dedicated account manager",
      ],
    },
    {
      id: "enterprise",
      name: "Enterprise",
      price: 249,
      features: [
        "Unlimited interview links",
        "Custom interview topics",
        "Advanced analytics & reporting",
        "White-label solution",
        "API access",
        "Dedicated account manager",
        "Phone & email support",
        "Unlimited HR accounts",
      ],
      notIncluded: [],
    },
  ];

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      setLoading(true);

      try {
        const subscriptionData = await hrApi.getSubscription();

        // Format the data for display
        setSubscription({
          plan: subscriptionData.plan,
          status: subscriptionData.status,
          nextBillingDate: subscriptionData.end_date,
          paymentMethod: subscriptionData.payment_method || {
            type: "credit_card",
            last4: "****",
            expiryMonth: 0,
            expiryYear: 0,
          },
        });
      } catch (err) {
        console.error("Failed to fetch subscription:", err);
        // Set default subscription data for new users
        setSubscription({
          plan: "starter",
          status: "trial",
          nextBillingDate: new Date(
            Date.now() + 14 * 24 * 60 * 60 * 1000
          ).toISOString(),
          paymentMethod: {
            type: "none",
            last4: "****",
            expiryMonth: 0,
            expiryYear: 0,
          },
        });
      }

      setLoading(false);
    } catch (err) {
      setError("Failed to load subscription data: " + err.message);
      setLoading(false);
    }
  };

  const handleChangePlan = (planId) => {
    setSelectedPlan(planId);
    setShowPaymentModal(true);
  };

  const handleUpdatePayment = async () => {
    try {
      // Validate payment data
      if (
        !paymentData.card_number ||
        !paymentData.expiry_month ||
        !paymentData.expiry_year ||
        !paymentData.cvc ||
        !paymentData.cardholder_name
      ) {
        setError("Please fill in all payment fields");
        return;
      }

      // Update payment method
      await hrApi.updatePaymentMethod(paymentData);

      // If a new plan was selected, update the subscription
      if (selectedPlan) {
        await hrApi.updateSubscription(selectedPlan);
      }

      // Refresh subscription data
      await fetchSubscription();

      // Close modal and reset form
      setShowPaymentModal(false);
      setSelectedPlan("");
      setPaymentData({
        type: "credit_card",
        card_number: "",
        expiry_month: "",
        expiry_year: "",
        cvc: "",
        cardholder_name: "",
      });

      alert("Payment information updated successfully");
    } catch (err) {
      setError("Failed to update payment information: " + err.message);
    }
  };

  const handleCancelSubscription = async () => {
    if (
      confirm(
        "Are you sure you want to cancel your subscription? This will take effect at the end of your current billing period."
      )
    ) {
      try {
        await hrApi.cancelSubscription();

        // Update the subscription status
        setSubscription({
          ...subscription,
          status: "cancelled",
        });

        alert(
          "Subscription cancelled. You will have access until the end of your current billing period."
        );
      } catch (err) {
        setError("Failed to cancel subscription: " + err.message);
      }
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
        <h1 className="text-3xl font-bold text-gray-900">
          Subscription Management
        </h1>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-md mb-8">
          {error}
        </div>
      )}

      {/* Current Subscription */}
      <div className="card mb-8">
        <h2 className="text-xl font-bold mb-6">Current Subscription</h2>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <div className="mb-4">
              <p className="text-sm text-gray-500">Current Plan</p>
              <p className="text-lg font-semibold">
                {plans.find((p) => p.id === subscription.plan)?.name ||
                  "Unknown"}
              </p>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-500">Status</p>
              <p className="text-lg font-semibold flex items-center">
                <span
                  className={`inline-block w-2 h-2 rounded-full mr-2 ${
                    subscription.status === "active" ||
                    subscription.status === "trial"
                      ? "bg-green-500"
                      : "bg-red-500"
                  }`}
                ></span>
                {subscription.status === "active"
                  ? "Active"
                  : subscription.status === "trial"
                  ? "Trial"
                  : subscription.status === "cancelled"
                  ? "Cancelled"
                  : "Expired"}
              </p>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-500">Next Billing Date</p>
              <p className="text-lg font-semibold">
                {new Date(subscription.nextBillingDate).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div>
            <div className="mb-4">
              <p className="text-sm text-gray-500">Payment Method</p>
              {subscription.paymentMethod.type === "none" ? (
                <p className="text-lg font-semibold">
                  No payment method on file
                </p>
              ) : (
                <>
                  <p className="text-lg font-semibold flex items-center">
                    <FiCreditCard className="mr-2" />
                    {subscription.paymentMethod.type === "credit_card"
                      ? "Credit Card"
                      : "Other"}{" "}
                    ending in {subscription.paymentMethod.last4}
                  </p>
                  {subscription.paymentMethod.expiryMonth > 0 && (
                    <p className="text-sm text-gray-500">
                      Expires {subscription.paymentMethod.expiryMonth}/
                      {subscription.paymentMethod.expiryYear}
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="flex space-x-4 mt-6">
              <button
                onClick={() => setShowPaymentModal(true)}
                className="btn-outline"
              >
                Update Payment Method
              </button>

              {(subscription.status === "active" ||
                subscription.status === "trial") && (
                <button
                  onClick={handleCancelSubscription}
                  className="text-red-600 hover:text-red-800"
                >
                  Cancel Subscription
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Plans */}
      <div>
        <h2 className="text-xl font-bold mb-6">Available Plans</h2>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`card relative ${
                plan.popular ? "border-2 border-primary" : ""
              }`}
            >
              {plan.popular && (
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

                {plan.notIncluded.map((feature, index) => (
                  <li key={index} className="flex items-start text-gray-400">
                    <FiX className="text-red-400 mt-1 mr-2 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleChangePlan(plan.id)}
                className={`w-full ${
                  plan.id === subscription.plan
                    ? "bg-gray-200 text-gray-700 cursor-not-allowed"
                    : "btn-primary"
                }`}
                disabled={plan.id === subscription.plan}
              >
                {plan.id === subscription.plan ? "Current Plan" : "Select Plan"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-6">
              {selectedPlan
                ? "Change Subscription Plan"
                : "Update Payment Method"}
            </h2>

            {selectedPlan && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">New Plan</p>
                <p className="text-lg font-semibold">
                  {plans.find((p) => p.id === selectedPlan)?.name || "Unknown"}{" "}
                  - ${plans.find((p) => p.id === selectedPlan)?.price}/month
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Card Number
                </label>
                <input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  className="input-field"
                  value={paymentData.card_number}
                  onChange={(e) =>
                    setPaymentData({
                      ...paymentData,
                      card_number: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="MM"
                      className="input-field"
                      value={paymentData.expiry_month}
                      onChange={(e) =>
                        setPaymentData({
                          ...paymentData,
                          expiry_month: e.target.value,
                        })
                      }
                    />
                    <input
                      type="text"
                      placeholder="YY"
                      className="input-field"
                      value={paymentData.expiry_year}
                      onChange={(e) =>
                        setPaymentData({
                          ...paymentData,
                          expiry_year: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CVC
                  </label>
                  <input
                    type="text"
                    placeholder="123"
                    className="input-field"
                    value={paymentData.cvc}
                    onChange={(e) =>
                      setPaymentData({ ...paymentData, cvc: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  placeholder="John Smith"
                  className="input-field"
                  value={paymentData.cardholder_name}
                  onChange={(e) =>
                    setPaymentData({
                      ...paymentData,
                      cardholder_name: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-8">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button onClick={handleUpdatePayment} className="btn-primary">
                {selectedPlan ? "Change Plan" : "Update Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscription;
