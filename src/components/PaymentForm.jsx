import { useState } from "react";
import { PayPalButtons } from "@paypal/react-paypal-js";
import { FiCreditCard, FiDollarSign } from "react-icons/fi";

const PaymentForm = ({ onSubmit, amount, loading }) => {
  const [error, setError] = useState(null);

  const handlePayPalCreateOrder = (data, actions) => {
    return actions.order.create({
      purchase_units: [
        {
          amount: {
            value: amount.toString(),
            currency_code: "USD",
          },
        },
      ],
    });
  };

  const handlePayPalApprove = async (data, actions) => {
    try {
      const order = await actions.order.capture();
      return onSubmit({
        type: "paypal",
        orderId: order.id,
        paymentId: order.purchase_units[0].payments.captures[0].id,
      });
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  return (
    <form className="space-y-6">
      {error && <div className="text-red-500 text-sm">{error}</div>}

      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <p className="text-gray-600">You will be charged ${amount} per month</p>
      </div>

      <PayPalButtons
        createOrder={handlePayPalCreateOrder}
        onApprove={handlePayPalApprove}
        onError={(err) => setError(err.message)}
        disabled={loading}
        style={{
          layout: "vertical",
          shape: "rect",
          label: "subscribe",
        }}
      />
    </form>
  );
};

export default PaymentForm;
