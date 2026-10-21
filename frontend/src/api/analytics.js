import { apiRequest } from "./client";

export const analyticsApi = {
  ownerSummary: () => apiRequest({ method: "get", url: "/analytics/owner-summary" }),
  dashboard: () => apiRequest({ method: "get", url: "/analytics/dashboard" }),
  adminSummary: () => apiRequest({ method: "get", url: "/analytics/dashboard" }),
  occupancy: () => apiRequest({ method: "get", url: "/analytics/occupancy" }),
  revenue: () => apiRequest({ method: "get", url: "/analytics/revenue" }),
  bookings: () => apiRequest({ method: "get", url: "/analytics/bookings" }),
};

export const reportsApi = {
  occupancy: (params) => apiRequest({ method: "get", url: "/reports/occupancy", params }),
  revenue: (params) => apiRequest({ method: "get", url: "/reports/revenue", params }),
  staffPerformance: (params) => apiRequest({ method: "get", url: "/reports/staff-performance", params }),
  weekly: () => apiRequest({ method: "get", url: "/reports/bi/weekly" }),
  monthly: () => apiRequest({ method: "get", url: "/reports/bi/monthly" }),
};
