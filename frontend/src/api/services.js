// Compatibility barrel. New code should import from the module-specific file.
export { authApi } from "./auth";
export { propertyApi } from "./properties";
export { roomApi, bedApi } from "./rooms";
export { bookingApi } from "./bookings";
export { analyticsApi, reportsApi } from "./analytics";
export { receptionApi, financeApi, managementApi, experienceApi } from "./operations";
export { systemApi, cameraApi } from "./system";

import { apiRequest } from "./client";

export const healthApi = {
  ping: () => apiRequest({ method: "get", url: "/health", timeout: 6000 }),
};
