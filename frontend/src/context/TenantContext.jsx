import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { tenantApi } from "../api/tenant";
import LoadingState from "../components/ui/LoadingState";
import { getTenantSlug } from "../lib/tenantRoute";

const TenantContext = createContext(null);

// Null outside a hotel (platform pages), so shared components can fall back to ROOST branding.
export const useTenant = () => useContext(TenantContext);

export function TenantProvider({ children }) {
  const slug = getTenantSlug();
  const [state, setState] = useState({ tenant: null, error: null, loading: true });

  const load = useCallback(
    () => tenantApi.publicInfo(slug)
      .then((tenant) => setState({ tenant, error: null, loading: false }))
      .catch((error) => setState({ tenant: null, error, loading: false })),
    [slug],
  );

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (state.tenant) document.title = state.tenant.name;
  }, [state.tenant]);

  const value = useMemo(() => state.tenant && { ...state.tenant, refresh: load }, [state.tenant, load]);

  if (state.loading) return <LoadingState label="Loading…" />;

  if (state.error) {
    const suspended = state.error.code === "TENANT_SUSPENDED";
    return (
      <main className="grid min-h-screen place-items-center bg-[#faf8f5] p-6 text-center">
        <div className="max-w-md">
          <h1 className="text-2xl font-extrabold text-ink-900">{suspended ? "This hotel is unavailable" : "Hotel not found"}</h1>
          <p className="mt-2 text-sm text-ink-500">
            {suspended
              ? "Bookings for this hotel are paused. Please contact the hotel directly."
              : `We couldn't find a hotel at “/${slug}”. Check the link you were given.`}
          </p>
          <a href="/" className="btn-outline mt-6 inline-flex">Go to ROOST</a>
        </div>
      </main>
    );
  }

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}
