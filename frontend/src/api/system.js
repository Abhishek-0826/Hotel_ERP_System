import { apiRequest } from "./client";

export const systemApi = {
  accessControl: () => apiRequest({ method: "get", url: "/system/access-control" }),
  settings: () => apiRequest({ method: "get", url: "/system/settings" }),
  updateSettings: (data) => apiRequest({ method: "patch", url: "/system/settings", data }),
  auditLogs: (params) => apiRequest({ method: "get", url: "/system/audit-logs", params }),
  camera: () => apiRequest({ method: "get", url: "/system/camera" }),
  updateCamera: (data) => apiRequest({ method: "put", url: "/system/camera", data }),
  backup: () => apiRequest({ method: "get", url: "/system/backup" }),
  restore: () => apiRequest({ method: "post", url: "/system/restore" }),
};

export const cameraApi = {
  list: (params) => apiRequest({ method: "get", url: "/roost/cameras", params }),
  create: (data) => apiRequest({ method: "post", url: "/roost/cameras", data }),
  update: (cameraId, data) => apiRequest({ method: "patch", url: `/roost/cameras/${encodeURIComponent(cameraId)}`, data }),
  remove: (cameraId) => apiRequest({ method: "delete", url: `/roost/cameras/${encodeURIComponent(cameraId)}` }),
};
