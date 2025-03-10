import { api, APIError } from "./config";

export const subscriptionApi = {
  getPlans: async () => {
    try {
      const response = await api.get("/subscription-plans");
      return response.data.map((plan) => ({
        id: plan.id || plan._id,
        name: plan.name,
        price: plan.price,
        features: plan.features,
        billing_period: plan.billing_period || "monthly",
        is_popular: plan.is_popular || false,
        max_hr_accounts: plan.max_hr_accounts,
        max_interviews: plan.max_interviews,
        max_candidates: plan.max_candidates,
      }));
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to fetch subscription plans", 500);
    }
  },

  getCurrentSubscription: async () => {
    try {
      const response = await api.get("/subscription-plans/current");
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to fetch current subscription", 500);
    }
  },

  purchasePlan: async (planId, paymentMethodId) => {
    try {
      const response = await api.post("/subscription-plans/purchase", {
        plan_id: planId,
        payment_method_id: paymentMethodId,
      });
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to purchase subscription plan", 500);
    }
  },

  cancelSubscription: async () => {
    try {
      const response = await api.post("/subscription-plans/cancel");
      return response.data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to cancel subscription", 500);
    }
  },
};
