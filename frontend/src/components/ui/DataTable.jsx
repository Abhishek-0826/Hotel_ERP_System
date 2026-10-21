import { useState } from "react";
import { ChevronUp, ChevronDown } from "../icons";
import Pagination from "./Pagination";

/**
 * Reusable data table with sorting, pagination, and optional search.
 *
 * Props:
 *   columns: [{ key, label, render?, sortable? }]
 *   data: array of row objects
 *   pageSize?: number (default 10)
 *   emptyMessage?: string
 */
export default function DataTable({
  columns = [],
  data = [],
  pageSize = 10,
  emptyMessage = "No records found.",
  className = "",
}) {
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  // Sort
  const sorted = sortKey
    ? [...data].sort((a, b) => {
        const av = a[sortKey] ?? "";
        const bv = b[sortKey] ?? "";
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
        return sortDir === "asc" ? cmp : -cmp;
      })
    : data;

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const rows = sorted.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  };

  return (
    <div className={className}>
      <div className="overflow-x-auto rounded-xl border border-ink-100">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-ink-100 bg-ink-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-ink-500 select-none ${col.sortable ? "cursor-pointer hover:text-ink-800" : ""}`}
                  onClick={() => col.sortable && toggleSort(col.key)}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-50">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-sm text-ink-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={row.id ?? i} className="hover:bg-ink-50 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-ink-800">
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={safePage} pageCount={totalPages} setPage={setPage} total={sorted.length} pageSize={pageSize} />
    </div>
  );
}
