import { useEffect, useState, useCallback } from "react";
import { getApiErrorMessage } from "../api/client";
import { DEMO_MODE } from "../config/demo";

/**
 * Fetch-with-fallback: calls `fetcher`, and if it fails (backend endpoint
 * not ready / network error), falls back to `fallbackData` and surfaces a
 * soft, dismissible notice instead of a hard error screen.
 *
 * Usage: const { data, loading, error, reload } = useApi(() => propertyApi.list(), demoProperties, { deps: [] })
 */
export function useApi(fetcher, fallbackData, { deps = [], transform, fallbackNotice } = {}) {
  const effectiveFallback = DEMO_MODE ? fallbackData : Array.isArray(fallbackData) ? [] : null;
  const [data, setData] = useState(effectiveFallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [usingFallback, setUsingFallback] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    fetcher()
      .then((res) => {
        const value = transform ? transform(res) : res;
        setData(value ?? effectiveFallback);
        setUsingFallback(false);
      })
      .catch((requestError) => {
        const fallbackValue = transform && effectiveFallback ? transform(effectiveFallback) : effectiveFallback;
        setData(fallbackValue);
        setUsingFallback(Boolean(effectiveFallback));
        setError(
          fallbackNotice ||
            (effectiveFallback
              ? "Live data isn't available right now, so we're showing example data instead."
              : getApiErrorMessage(requestError, "Live data isn't available right now."))
        );
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, usingFallback, reload: load, setData };
}
