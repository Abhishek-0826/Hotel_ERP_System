import { defineConfig, devices } from "@playwright/test";

const PORT = 5199;

// The whole backend is mocked in the browser (see e2e/support/mockApi.js), so the suite needs
// no database or Supabase project. Supabase is blanked out so the app uses its own token login.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /smoke\.spec\.js/ },
  ],
  webServer: {
    command: `npx vite build --outDir dist-e2e && npx vite preview --outDir dist-e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      VITE_SUPABASE_URL: "",
      VITE_SUPABASE_PUBLISHABLE_KEY: "",
      VITE_USE_DEMO_DATA: "false",
      VITE_API_BASE_URL: "/api/v1",
      VITE_API_PROXY_TARGET: "",
      VITE_PUBLIC_APP_URL: `http://localhost:${PORT}`,
    },
  },
});
