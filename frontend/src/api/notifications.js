import { apiRequest } from "./client";

export const notificationApi = {
  list: () => apiRequest({ method: "get", url: "/notifications" }),
  markRead: (id) => apiRequest({ method: "patch", url: `/notifications/${encodeURIComponent(id)}/read` }),
  markAllRead: () => apiRequest({ method: "patch", url: "/notifications/read-all" }),
};
