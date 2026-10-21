import { useState } from "react";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import { CardSkeleton } from "../ui/LoadingState";
import ApiNotice from "../ui/ApiNotice";
import { Search, Plus, Pencil, Trash2 } from "../icons";
import Pagination, { usePagination } from "../ui/Pagination";

/**
 * Generic, reusable admin/owner data table: search box, column headers,
 * status badges and row actions. Property, room/bed and booking management
 * screens are all thin wrappers around this so the UI stays consistent.
 */
export default function ManageTable({ title, subtitle, addLabel, onAdd, headers, rows, loading, error, statusColumnIndex, onEdit, onDelete, onView, viewLabel = "View", viewDisabledReason, extraActions, emptyTitle, hideSearch }) {
  const [q, setQ] = useState("");
  const filtered = rows.filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));
  const paging = usePagination(filtered, { resetKey: q });

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-ink-900">{title}</h1>
          <p className="mt-1 text-sm text-ink-500">{subtitle}</p>
        </div>
        {onAdd && <Button variant="teal" size="sm" onClick={onAdd}><Plus size={15} /> {addLabel}</Button>}
      </div>

      <ApiNotice message={error} />

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-ink-100 p-4">
          <b className="text-sm text-ink-800">{title}</b>
          {!hideSearch && (
            <div className="relative w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="input py-2 pl-8 text-sm" />
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col gap-2 p-4">{[1, 2, 3].map((x) => <CardSkeleton key={x} className="h-11" />)}</div>
        ) : filtered.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-[11px] font-bold uppercase tracking-wide text-ink-400">
                  {headers.map((h) => <th key={h} className="px-4 py-3">{h}</th>)}
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paging.pageItems.map((r, i) => (
                  <tr key={r.id || r.code || i} className="border-b border-ink-50 last:border-0 hover:bg-ink-50/60">
                    {r.cols.map((c, j) => (
                      <td key={j} className="px-4 py-3 text-ink-700">
                        {j === statusColumnIndex ? <Badge value={c} /> : c}
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex gap-1.5">
                        {onView && (() => {
                          // A disabled button explains itself on hover (the span carries the tooltip, since disabled buttons swallow hover in some browsers).
                          const reason = viewDisabledReason?.(r);
                          return (
                            <span title={reason || undefined}>
                              <Button variant="outline" size="sm" disabled={Boolean(reason)} aria-disabled={Boolean(reason)} onClick={() => onView(r)}>{viewLabel}</Button>
                            </span>
                          );
                        })()}
                        {extraActions?.(r)}
                        {onEdit && <Button size="sm" onClick={() => onEdit(r)}><Pencil size={13} /> Edit</Button>}
                        {onDelete && <Button variant="danger" size="sm" onClick={() => onDelete(r)}><Trash2 size={13} /></Button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination {...paging} className="px-4 pb-4" />
          </div>
        ) : (
          <div className="p-6"><EmptyState title={emptyTitle || "Nothing here yet"} /></div>
        )}
      </div>
    </section>
  );
}
