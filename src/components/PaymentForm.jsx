import { useState } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { FiCreditCard, FiDollarSign } from "react-icons/fi";
import { SiGooglepay } from "react-icons/si";

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: "#32325d",
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      fontSmoothing: "antialiased",
      fontSize: "16px",
      "::placeholder": {
        color: "#aab7c4",
      },
    },
    invalid: {
      color: "#fa755a",
      iconColor: "#fa755a",
    },
  },
};

const PaymentForm = ({ onSubmit, amount, loading }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState("card");
  const [bankInfo, setBankInfo] = useState({
    accountName: "",
    accountNumber: "",
    routingNumber: "",
  });

  const paymentMethods = [
    { id: "card", name: "Credit Card", icon: FiCreditCard },
    { id: "googlepay", name: "Google Pay", icon: SiGooglepay },
    { id: "bank", name: "Bank Transfer", icon: FiDollarSign },
  ];

  const handleStripeSubmit = async () => {
    if (!stripe || !elements) {
      return;
    }

    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: "card",
      card: elements.getElement(CardElement),
    });

    if (error) {
      setError(error.message);
      return false;
    }

    return onSubmit({
      type: "card",
      paymentMethod: paymentMethod.id,
    });
  };

  const handleGooglePaySubmit = async () => {
    if (!stripe) {
      setError("Stripe not loaded");
      return;
    }

    try {
      const { paymentMethod } = await stripe.createPaymentMethod({
        type: "card",
        card: {
          token: "tok_visa", // Use test token for development
        },
        billing_details: {
          name: "Test User",
          email: "test@example.com",
        },
      });

      return onSubmit({
        type: "googlepay",
        paymentMethod: paymentMethod.id,
      });
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const handleBankSubmit = async () => {
    if (
      !bankInfo.accountName ||
      !bankInfo.accountNumber ||
      !bankInfo.routingNumber
    ) {
      setError("Please fill in all bank information");
      return;
    }

    try {
      return onSubmit({
        type: "bank",
        bankInfo: {
          accountName: bankInfo.accountName,
          accountNumber: bankInfo.accountNumber,
          routingNumber: bankInfo.routingNumber,
        },
      });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (event) => {
    if (event) {
      event.preventDefault();
    }
    setError(null);

    try {
      switch (selectedMethod) {
        case "card":
          return handleStripeSubmit();
        case "googlepay":
          return handleGooglePaySubmit();
        case "bank":
          return handleBankSubmit();
        default:
          setError("Please select a payment method");
          return false;
      }
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const renderPaymentMethodContent = () => {
    switch (selectedMethod) {
      case "card":
        return (
          <div className="p-4 border rounded-md bg-white">
            <CardElement options={CARD_ELEMENT_OPTIONS} />
          </div>
        );

      case "googlepay":
        return (
          <div className="p-4 border rounded-md bg-white text-center">
            <button
              onClick={handleGooglePaySubmit}
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-black hover:bg-gray-900"
            >
              <SiGooglepay className="w-6 h-6 mr-2" />
              Pay with Google Pay
            </button>
          </div>
        );

      case "bank":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Holder Name
              </label>
              <input
                type="text"
                value={bankInfo.accountName}
                onChange={(e) =>
                  setBankInfo({ ...bankInfo, accountName: e.target.value })
                }
                className="input-field"
                placeholder="Enter account holder name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Number
              </label>
              <input
                type="text"
                value={bankInfo.accountNumber}
                onChange={(e) =>
                  setBankInfo({ ...bankInfo, accountNumber: e.target.value })
                }
                className="input-field"
                placeholder="Enter account number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Routing Number
              </label>
              <input
                type="text"
                value={bankInfo.routingNumber}
                onChange={(e) =>
                  setBankInfo({ ...bankInfo, routingNumber: e.target.value })
                }
                className="input-field"
                placeholder="Enter routing number"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {paymentMethods.map((method) => (
          <button
            key={method.id}
            type="button"
            onClick={() => setSelectedMethod(method.id)}
            className={`p-4 border rounded-lg flex flex-col items-center justify-center space-y-2 transition-colors ${
              selectedMethod === method.id
                ? "border-primary bg-primary/5"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <method.icon
              className={`text-2xl ${
                selectedMethod === method.id ? "text-primary" : "text-gray-500"
              }`}
            />
            <span
              className={`text-sm font-medium ${
                selectedMethod === method.id ? "text-primary" : "text-gray-700"
              }`}
            >
              {method.name}
            </span>
          </button>
        ))}
      </div>

      {renderPaymentMethodContent()}

      {error && <div className="text-red-500 text-sm">{error}</div>}

      <button
        type="submit"
        disabled={!selectedMethod || loading}
        className="btn-primary w-full flex items-center justify-center"
      >
        {loading ? "Processing..." : `Pay $${amount}`}
      </button>
    </form>
  );
};

export default PaymentForm;
