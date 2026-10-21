import { apiRequest } from "./client";

export const tenantApi = {
  // Public branding for /<slug>
  publicInfo: (slug) => apiRequest({ method: "get", url: `/public/tenants/${encodeURIComponent(slug)}` }),
  // The signed-in owner's hotel
  mine: () => apiRequest({ method: "get", url: "/tenant/me" }),
  update: (data) => apiRequest({ method: "patch", url: "/tenant/me", data }),
  uploadLogo: (data) => apiRequest({ method: "post", url: "/tenant/me/logo", data }),
};

export const platformApi = {
  listHotels: () => apiRequest({ method: "get", url: "/platform/tenants" }),
  createHotel: (data) => apiRequest({ method: "post", url: "/platform/tenants", data }),
  updateHotel: (id, data) => apiRequest({ method: "patch", url: `/platform/tenants/${id}`, data }),
  ownerAccess: (id, data) => apiRequest({ method: "post", url: `/platform/tenants/${id}/owner-access`, data }),
};
