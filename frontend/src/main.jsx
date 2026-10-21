import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AppStateProvider } from "./context/AppStateContext";
import { BookingProvider } from "./context/BookingContext";
import { TenantProvider } from "./context/TenantContext";
import App from "./App";
import PlatformApp from "./pages/platform/PlatformApp";
import { getTenantSlug } from "./lib/tenantRoute";
import "./index.css";

// "/" and "/platform/*" are the ROOST platform. Any other first segment is a hotel
// (/sunrise-test/...), and the whole hotel app is mounted beneath that prefix.
const tenantSlug = getTenantSlug();

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter basename={tenantSlug ? `/${tenantSlug}` : undefined}>
      <AuthProvider>
        <AppStateProvider>
          {tenantSlug ? (
            <TenantProvider>
              <BookingProvider>
                <App />
              </BookingProvider>
            </TenantProvider>
          ) : (
            <PlatformApp />
          )}
        </AppStateProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
