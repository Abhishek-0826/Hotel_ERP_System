import { Link } from "react-router-dom";
import { useTenant } from "../../context/TenantContext";
import { useInShell } from "./shellContext";

export function Footer() {
  const tenant = useTenant();
  if (useInShell()) return null;
  return (
    <>
      <footer className="border-t border-ink-100 bg-white py-6">
        <div className="container-page flex flex-col items-center justify-between gap-3 text-sm text-ink-500 sm:flex-row">
          <span>© {new Date().getFullYear()} {tenant ? tenant.name : "ROOST"}.{tenant ? " Powered by ROOST." : " Better stays, together."}</span>
          <span className="flex gap-4">
            <Link to="/contact" className="hover:text-brand-600">Help center</Link>
          </span>
        </div>
      </footer>
    </>
  );
}
