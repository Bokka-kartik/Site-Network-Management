const Pagination = ({ page, totalPages, total, perPage, onPageChange }) => {
  if (totalPages <= 1) return null;

  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  const pages = [];
  // ex: if its 1,2,3 it will display that but if that are more then 3 then it will enter the else block are try to disable the middle button and 
  // as 1,2 ....,6
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      // make sure that the pages are less then 3 so it won't over flow 
      pages.push("...");
    }
  }

  return (
    <div className="pagination">
      <span className="pagination-info">
        Showing {start}–{end} of {total}
      </span>
      <div className="pagination-buttons">
        <button
          className={`page-btn ${page === 1 ? "page-btn-disabled" : "page-btn-default"}`}
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}>
          ‹
        </button>
        {/* this map is a by-function which means it will render based upon the p value  */}
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`dot-${i}`} className="page-btn page-btn-disabled">…</span>
          ) : (
            <button key={p}
              className={`page-btn ${p === page ? "page-btn-active" : "page-btn-default"}`}
              onClick={() => onPageChange(p)}>
              {p}
            </button>
          )
        )}
        <button
          className={`page-btn ${page === totalPages ? "page-btn-disabled" : "page-btn-default"}`}
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}>
          ›
        </button>
      </div>
    </div>
  );
};

export default Pagination;
