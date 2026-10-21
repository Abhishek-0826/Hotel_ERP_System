import { useEffect, useMemo, useState } from "react";
import ReactPaginate from "react-paginate";

export const PAGE_SIZE = 10;

/** Client-side paging for an array. `resetKey` sends the user back to page 1 (e.g. when a search changes). */
export function usePagination(items, { pageSize = PAGE_SIZE, resetKey } = {}) {
  const [page, setPage] = useState(0);
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount - 1);

  useEffect(() => { setPage(0); }, [resetKey]);

  const pageItems = useMemo(() => items.slice(safePage * pageSize, (safePage + 1) * pageSize), [items, safePage, pageSize]);
  return { pageItems, page: safePage, pageCount, setPage, total, pageSize };
}

const item = "grid h-8 min-w-8 place-items-center rounded-lg px-2 text-xs font-semibold text-ink-600 transition hover:bg-ink-100";

/** Page switcher built on react-paginate. Renders nothing when everything fits on one page. */
export default function Pagination({ page, pageCount, setPage, total, pageSize = PAGE_SIZE, className = "" }) {
  if (pageCount <= 1) return null;
  const from = page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, total);

  return (
    <nav aria-label="Pagination" className={`mt-4 flex flex-col items-center justify-between gap-3 text-xs text-ink-500 sm:flex-row ${className}`}>
      <span>Showing {from}–{to} of {total}</span>
      <ReactPaginate
        forcePage={page}
        pageCount={pageCount}
        onPageChange={({ selected }) => setPage(selected)}
        pageRangeDisplayed={3}
        marginPagesDisplayed={1}
        previousLabel="← Prev"
        nextLabel="Next →"
        previousAriaLabel="Previous page"
        nextAriaLabel="Next page"
        ariaLabelBuilder={(n, selected) => `${selected ? "Current page, page" : "Go to page"} ${n}`}
        containerClassName="flex flex-wrap items-center gap-1"
        pageLinkClassName={`${item} cursor-pointer`}
        previousLinkClassName={`${item} cursor-pointer`}
        nextLinkClassName={`${item} cursor-pointer`}
        breakLinkClassName={item}
        activeLinkClassName="!bg-brand-500 !text-white hover:!bg-brand-500"
        disabledLinkClassName="pointer-events-none opacity-40"
      />
    </nav>
  );
}
