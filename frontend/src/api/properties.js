import { apiRequest } from "./client";

const asItems = (value) => value?.items ?? value ?? [];

export const propertyApi = {
  list: async (params) => asItems(await apiRequest({ method: "get", url: "/properties", params })),
  get: (slug) => apiRequest({ method: "get", url: `/properties/${encodeURIComponent(slug)}` }),
  availability: (slug, params) => apiRequest({ method: "get", url: `/properties/${encodeURIComponent(slug)}/availability`, params }),
  mine: async () => asItems(await apiRequest({ method: "get", url: "/properties/mine" })),
  create: (data) => apiRequest({ method: "post", url: "/properties", data }),
  update: (propertyId, data) => apiRequest({ method: "patch", url: `/properties/${encodeURIComponent(propertyId)}`, data }),
  updateStatus: (propertyId, status) => apiRequest({ method: "patch", url: `/properties/${encodeURIComponent(propertyId)}/status`, data: { status } }),
  remove: (propertyId) => apiRequest({ method: "delete", url: `/properties/${encodeURIComponent(propertyId)}` }),
};
