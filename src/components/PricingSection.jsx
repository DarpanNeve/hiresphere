import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FiCheck, FiX } from "react-icons/fi";
import { subscriptionApi } from "../services/api/subscription";

const PricingSection = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const data = await subscriptionApi.getPlans();
      setPlans(data);
      setLoading(false);
    } catch (err) {
      setError("Failed to load subscription plans");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <section className="py-20 bg-gray-50" id="pricing">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600">
            Choose the plan that best fits your needs
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div
              key={plan._id}
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
                <span className="text-sm text-gray-500">
                  /{plan.billing_period}
                </span>
              </p>

              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <FiCheck className="text-green-500 mt-1 mr-2 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/register"
                className={`w-full text-center ${
                  plan.is_popular ? "btn-primary" : "btn-outline"
                }`}
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-600">
            Need a custom plan?{" "}
            <a
              href="mailto:sales@aiinterviewer.com"
              className="text-primary hover:text-secondary"
            >
              Contact us
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
