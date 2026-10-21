import { Link, useSearchParams } from "react-router-dom";
import { reportsApi } from "../api/analytics";
import { ArrowLeft, Printer } from "../components/icons";
import DataTable from "../components/ui/DataTable";
import { useApi } from "../hooks/useApi";

const reportLoaders = {
  occupancy: reportsApi.occupancy,
  revenue: reportsApi.revenue,
  staff: reportsApi.staffPerformance,
};

const labels = { occupancy: "Occupancy report", revenue: "Revenue report", staff: "Staff performance" };
const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value || 0));

function Occupancy({ data }) {
  const rows = Array.isArray(data) ? data : data?.items || data?.rooms || [];
  return <DataTable data={rows} columns={[{ key: "status", label: "Bed status" }, { key: "count", label: "Beds" }]} />;
}

function Revenue({ data }) {
  const rows = Array.isArray(data) ? data : data?.items || data?.byMethod || [];
  return <DataTable data={rows} columns={[{ key: "method", label: "Method" }, { key: "payments", label: "Payments" }, { key: "amount", label: "Revenue", render: money }]} />;
}

function Staff({ data }) {
  const rows = Array.isArray(data) ? data : data?.items || [];
  return <DataTable data={rows} columns={[{ key: "userId", label: "User ID" }, { key: "action", label: "Audit action" }, { key: "count", label: "Occurrences" }]} />;
}

export default function ReportPage() {
  const [params] = useSearchParams();
  const type = reportLoaders[params.get("type")] ? params.get("type") : "occupancy";
  const { data, loading, error } = useApi(() => reportLoaders[type](), null, { deps: [type] });
  const Report = type === "revenue" ? Revenue : type === "staff" ? Staff : Occupancy;

  return (
    <main className="min-h-screen bg-ink-50 px-4 py-8 print:bg-white">
      <div className="mx-auto mb-6 flex max-w-5xl items-center justify-between print:hidden">
        <Link to="/reports" className="flex items-center gap-1 text-sm font-semibold text-ink-600"><ArrowLeft size={16} /> Back to reports</Link>
        <button onClick={() => window.print()} className="btn-primary"><Printer size={15} /> Print / Save PDF</button>
      </div>
      <article className="mx-auto max-w-5xl rounded-2xl bg-white p-8 shadow-sm print:shadow-none">
        <header className="border-b border-ink-100 pb-5">
          <p className="eyebrow">ROOST live report</p>
          <h1 className="mt-1 text-3xl font-extrabold">{labels[type]}</h1>
          <p className="mt-1 text-sm text-ink-500">Generated {new Date().toLocaleString()}</p>
        </header>
        {error && <p className="mt-6 rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p>}
        {loading ? <p className="mt-6">Loading report...</p> : <div className="mt-6"><Report data={data} /></div>}
      </article>
    </main>
  );
}
