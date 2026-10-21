import Brand from "../../components/layout/Navbar";
import { useTenant } from "../../context/TenantContext";

export default function AuthLayout({ title, subtitle, children }) {
  const tenant = useTenant();
  return (
    <main className="grid min-h-screen bg-grid bg-[#faf8f5] lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-gradient-to-br from-brand-500 to-brand-800 p-12 text-white lg:flex">
        <Brand className="text-white [&>span]:bg-white/20" />
        <div>
          <p className="eyebrow text-brand-100">{tenant ? "WELCOME" : "A BETTER WAY TO STAY"}</p>
          <h2 className="mt-3 max-w-sm text-3xl font-extrabold leading-tight">{tenant?.tagline || "Simple bed booking for modern shared spaces."}</h2>
        </div>
        <p className="text-sm text-brand-100">© {new Date().getFullYear()} {tenant ? tenant.name : "ROOST"}</p>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-6 lg:hidden"><Brand /></div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">{title}</h1>
          <p className="mt-1.5 text-sm text-ink-500">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
