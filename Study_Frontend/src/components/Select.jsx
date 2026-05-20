import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

const Select = ({ value, onChange, options, placeholder = "Select…", className = "" }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef(null);
  const listRef = useRef(null);

  const DROPDOWN_H = 240;

  const updatePos = useCallback(() => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      const openUp = spaceBelow < DROPDOWN_H && r.top > spaceBelow;
      setPos({
        top: openUp ? Math.max(4, r.top - DROPDOWN_H - 4) : r.bottom + 4,
        left: r.left,
        width: Math.max(r.width, 180),
        maxH: openUp ? r.top - 8 : window.innerHeight - r.bottom - 8,
      });
    }
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        const portal = document.getElementById("cselect-portal");
        if (portal && portal.contains(e.target)) return;
        setOpen(false); setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      updatePos();
      const raf = requestAnimationFrame(updatePos);
      window.addEventListener("scroll", updatePos, true);
      window.addEventListener("resize", updatePos);
      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("scroll", updatePos, true);
        window.removeEventListener("resize", updatePos);
      };
    }
  }, [open, updatePos]);

  useEffect(() => {
    if (open && listRef.current) {
      const idx = options.findIndex(o => o.value === value);
      if (idx > -1) {
        const el = listRef.current.children[idx];
        if (el) el.scrollIntoView({ block: "nearest" });
      }
    }
  }, [open]);

  const selected = options.find(o => o.value === value);
  const filtered = search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  let portalRoot = document.getElementById("cselect-portal");
  if (!portalRoot) {
    portalRoot = document.createElement("div");
    portalRoot.id = "cselect-portal";
    document.body.appendChild(portalRoot);
  }

  return (
    <div className={`cselect-wrap ${className}`} ref={ref}>
      <div
        className={`cselect-trigger ${open ? "cselect-trigger-active" : ""}`}
        onClick={() => { setOpen(!open); setSearch(""); }}
      >
        <span className={selected ? "cselect-value" : "cselect-placeholder"}>
          {selected ? selected.label : placeholder}
        </span>
        <svg className={`cselect-chevron ${open ? "cselect-chevron-open" : ""}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {open && createPortal(
        <div className="cselect-dropdown" style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999, maxHeight: pos.maxH }}>
          {options.length > 5 && (
            <input
              className="cselect-search"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <div className="cselect-list" ref={listRef}>
            {filtered.map((opt) => (
              <div
                key={opt.value}
                className={`cselect-option ${opt.value === value ? "cselect-option-active" : ""}`}
                onClick={() => { onChange(opt.value); setOpen(false); setSearch(""); }}
              >
                <span className="cselect-option-label">{opt.label}</span>
                {opt.sub && <span className="cselect-option-sub">{opt.sub}</span>}
                {opt.value === value && (
                  <svg className="cselect-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            ))}
            {filtered.length === 0 && <div className="cselect-empty">No results</div>}
          </div>
        </div>,
        portalRoot
      )}
    </div>
  );
};

export default Select;
