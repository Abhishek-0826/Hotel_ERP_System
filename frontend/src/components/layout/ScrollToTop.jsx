import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// A new page should always open at the top instead of keeping the previous scroll position.
export default function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname, search]);
  return null;
}
