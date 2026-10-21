export const DEMO_MODE = String(import.meta.env.VITE_USE_DEMO_DATA || "false")
  .trim()
  .toLowerCase() === "true";
