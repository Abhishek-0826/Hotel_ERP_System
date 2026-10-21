import { apiRequest } from "./client";

export const receptionApi = {
  guests: (params) => apiRequest({ method: "get", url: "/reception/guests", params }),
  registerGuest: (data) => apiRequest({ method: "post", url: "/reception/guests", data }),
  availability: (propertyId, params) => apiRequest({ method: "get", url: `/reception/properties/${encodeURIComponent(propertyId)}/availability`, params }),
  createBooking: (data) => apiRequest({ method: "post", url: "/reception/bookings", data }),
  booking: (code) => apiRequest({ method: "get", url: `/reception/bookings/${encodeURIComponent(code)}` }),
  checkIn: (code, data = {}) => apiRequest({ method: "patch", url: `/reception/bookings/${encodeURIComponent(code)}/check-in`, data }),
  dashboard: () => apiRequest({ method: "get", url: "/reception/dashboard" }),
  occupancy: (propertyId) => apiRequest({ method: "get", url: `/reception/properties/${encodeURIComponent(propertyId)}/occupancy` }),
  checkOut: (code) => apiRequest({ method: "patch", url: `/reception/bookings/${encodeURIComponent(code)}/check-out` }),
};

export const financeApi = {
  payments: (params) => apiRequest({ method: "get", url: "/finance/payments", params }),
  collectPayment: (data) => apiRequest({ method: "post", url: "/finance/payments", data }),
  invoice: (invoiceNumber) => apiRequest({ method: "get", url: `/finance/invoices/${encodeURIComponent(invoiceNumber)}` }),
  requestRefund: (data) => apiRequest({ method: "post", url: "/finance/refunds", data }),
  decideRefund: (refundId, action) => apiRequest({ method: "patch", url: `/finance/refunds/${encodeURIComponent(refundId)}/decision`, data: { action } }),
};

export const managementApi = {
  users: (params) => apiRequest({ method: "get", url: "/management/users", params }),
  createUser: (data) => apiRequest({ method: "post", url: "/management/users", data }),
  resetUserPassword: (userId, data = {}) => apiRequest({ method: "post", url: `/management/users/${encodeURIComponent(userId)}/reset-password`, data }),
  deleteUser: (userId) => apiRequest({ method: "delete", url: `/management/users/${encodeURIComponent(userId)}` }),
  updateUserStatus: (userId, status) => apiRequest({ method: "patch", url: `/management/users/${encodeURIComponent(userId)}/status`, data: { status } }),
  inventory: (params) => apiRequest({ method: "get", url: "/management/inventory/items", params }),
  createInventoryItem: (data) => apiRequest({ method: "post", url: "/management/inventory/items", data }),
  adjustStock: (itemId, data) => apiRequest({ method: "post", url: `/management/inventory/items/${encodeURIComponent(itemId)}/check`, data }),
  stockHistory: (itemId) => apiRequest({ method: "get", url: `/management/inventory/items/${encodeURIComponent(itemId)}/history` }),
  platformUsers: (params) => apiRequest({ method: "get", url: "/roost/users", params }),
  createPlatformUser: (data) => apiRequest({ method: "post", url: "/roost/users", data }),
  resetPlatformUserPassword: (userId, data = {}) => apiRequest({ method: "post", url: `/roost/users/${encodeURIComponent(userId)}/reset-password`, data }),
  deletePlatformUser: (userId) => apiRequest({ method: "delete", url: `/roost/users/${encodeURIComponent(userId)}` }),
  updatePlatformUser: (userId, data) => apiRequest({ method: "patch", url: `/roost/users/${encodeURIComponent(userId)}`, data }),
};

export const experienceApi = {
  submitFeedback: (data) => apiRequest({ method: "post", url: "/experience/feedback", data }),
  listFeedback: () => apiRequest({ method: "get", url: "/experience/feedback" }),
  feedbackAnalysis: () => apiRequest({ method: "get", url: "/experience/feedback/analysis" }),
  complaints: (params) => apiRequest({ method: "get", url: "/experience/complaints", params }),
  myComplaints: (params) => apiRequest({ method: "get", url: "/experience/complaints/mine", params }),
  submitComplaint: (data) => apiRequest({ method: "post", url: "/experience/complaints", data }),
  updateComplaint: (complaintId, data) => apiRequest({ method: "patch", url: `/experience/complaints/${encodeURIComponent(complaintId)}`, data }),
};
