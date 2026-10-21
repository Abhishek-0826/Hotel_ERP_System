import { apiRequest } from "./client";

export const roomApi = {
  list: (propertyId) => apiRequest({ method: "get", url: `/properties/${encodeURIComponent(propertyId)}/rooms` }),
  create: (propertyId, data) => apiRequest({ method: "post", url: `/properties/${encodeURIComponent(propertyId)}/rooms`, data }),
  update: (roomId, data) => apiRequest({ method: "patch", url: `/rooms/${encodeURIComponent(roomId)}`, data }),
};

export const bedApi = {
  list: (roomId) => apiRequest({ method: "get", url: `/rooms/${encodeURIComponent(roomId)}/beds` }),
  create: (roomId, data) => apiRequest({ method: "post", url: `/rooms/${encodeURIComponent(roomId)}/beds`, data }),
  update: (bedId, data) => apiRequest({ method: "patch", url: `/beds/${encodeURIComponent(bedId)}`, data }),
};
