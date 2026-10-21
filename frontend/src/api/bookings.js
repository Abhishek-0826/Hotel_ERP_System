import { apiRequest } from "./client";

export const bookingApi = {
  create: (data) => apiRequest({ method: "post", url: "/bookings", data }),
  get: (code) => apiRequest({ method: "get", url: `/bookings/${encodeURIComponent(code)}` }),
  cancel: (code, reason, guestEmail) => apiRequest({ method: "patch", url: `/bookings/${encodeURIComponent(code)}/cancel`, data: { reason, ...(guestEmail ? { guestEmail } : {}) } }),
  confirm: (code) => apiRequest({ method: "patch", url: `/bookings/${encodeURIComponent(code)}/confirm` }),
  reject: (code, reason) => apiRequest({ method: "patch", url: `/bookings/${encodeURIComponent(code)}/reject`, data: { reason } }),
  update: (code, action, data = {}) => apiRequest({ method: "patch", url: `/bookings/${encodeURIComponent(code)}/${encodeURIComponent(action)}`, data }),
  ownerList: async (params) => {
    const result = await apiRequest({ method: "get", url: "/bookings/owner", params });
    return result?.items ?? result ?? [];
  },
  // Walks every page so client-side tables see all rows that match the server-side filters.
  ownerListAll: async (params = {}) => {
    const items = [];
    for (let page = 1; page <= 20; page += 1) {
      const result = await apiRequest({ method: "get", url: "/bookings/owner", params: { ...params, page, pageSize: 100 } });
      items.push(...(result?.items ?? result ?? []));
      if (!result?.totalPages || page >= result.totalPages) break;
    }
    return items;
  },
  mine: async (params) => {
    const result = await apiRequest({ method: "get", url: "/bookings/mine", params });
    return result?.items ?? result ?? [];
  },
};
