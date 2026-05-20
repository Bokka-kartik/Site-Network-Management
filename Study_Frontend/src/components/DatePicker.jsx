import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ITEM_H = 32;
const VISIBLE = 5;
const CENTER = Math.floor(VISIBLE / 2);

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const ScrollColumn = ({ items, selected, onChange }) => {
  const colRef = useRef(null);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startScroll = useRef(0);

  const idx = items.indexOf(selected);
  const targetScroll = idx * ITEM_H;

  useEffect(() => {
    if (colRef.current && !dragging.current) {
      colRef.current.scrollTo({ top: targetScroll, behavior: "smooth" });
    }
  }, [targetScroll]);

  const snap = useCallback(() => {
    if (!colRef.current) return;
    const top = colRef.current.scrollTop;
    const i = clamp(Math.round(top / ITEM_H), 0, items.length - 1);
    colRef.current.scrollTo({ top: i * ITEM_H, behavior: "smooth" });
    if (items[i] !== selected) onChange(items[i]);
  }, [items, selected, onChange]);

  const onPointerDown = (e) => {
    dragging.current = true;
    startY.current = e.clientY;
    startScroll.current = colRef.current.scrollTop;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!dragging.current) return;
    const dy = startY.current - e.clientY;
    colRef.current.scrollTop = startScroll.current + dy;
  };

  const onPointerUp = () => {
    dragging.current = false;
    snap();
  };

  const onWheel = (e) => {
    e.preventDefault();
    if (!colRef.current) return;
    colRef.current.scrollTop += e.deltaY;
    clearTimeout(colRef.current._snapTimer);
    colRef.current._snapTimer = setTimeout(snap, 80);
  };

  return (
    <div className="drum-col-wrap">
      <div
        className="drum-col"
        ref={colRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <div style={{ height: CENTER * ITEM_H }} />
        {items.map((item, i) => (
          <div
            key={item}
            className={`drum-item ${item === selected ? "drum-item-active" : ""}`}
            style={{ height: ITEM_H }}
            onClick={() => { onChange(item); }}
          >
            {item}
          </div>
        ))}
        <div style={{ height: CENTER * ITEM_H }} />
      </div>
      <div className="drum-highlight" style={{ top: CENTER * ITEM_H, height: ITEM_H }} />
    </div>
  );
};

const daysInMonth = (m, y) => new Date(y, m + 1, 0).getDate();

const DatePicker = ({ value, onChange, min, max, placeholder = "Select date" }) => {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef(null);

  const parsed = value ? new Date(value + "T00:00:00") : null;
  const [month, setMonth] = useState(parsed ? parsed.getMonth() : new Date().getMonth());
  const [day, setDay] = useState(parsed ? parsed.getDate() : new Date().getDate());
  const [year, setYear] = useState(parsed ? parsed.getFullYear() : new Date().getFullYear());

  const DROPDOWN_H = 290;

  const updatePos = useCallback(() => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      const openUp = spaceBelow < DROPDOWN_H && r.top > spaceBelow;
      setPos({
        top: openUp ? Math.max(4, r.top - DROPDOWN_H - 4) : r.bottom + 4,
        left: r.left,
        width: Math.max(r.width, 260),
      });
    }
  }, []);

  useEffect(() => {
    if (value) {
      const d = new Date(value + "T00:00:00");
      setMonth(d.getMonth());
      setDay(d.getDate());
      setYear(d.getFullYear());
    }
  }, [value]);

  useEffect(() => { setError(""); }, [month, day, year]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        const portal = document.getElementById("datepicker-portal");
        if (portal && portal.contains(e.target)) return;
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      updatePos();
      window.addEventListener("scroll", updatePos, true);
      window.addEventListener("resize", updatePos);
      return () => {
        window.removeEventListener("scroll", updatePos, true);
        window.removeEventListener("resize", updatePos);
      };
    }
  }, [open, updatePos]);

  const years = [];
  for (let y = 1900; y <= 2100; y++) years.push(y);

  const maxDay = daysInMonth(month, year);
  const safeDay = clamp(day, 1, maxDay);
  const days = [];
  for (let d = 1; d <= maxDay; d++) days.push(d);

  const toStr = (y, m, d) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const currentStr = toStr(year, month, safeDay);
  const isInvalid = (min && currentStr < min) || (max && currentStr > max);

  const fmtLabel = (dateStr) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  };

  const confirm = () => {
    if (min && currentStr < min) {
      setError(`Date cannot be before ${fmtLabel(min)}`);
      return;
    }
    if (max && currentStr > max) {
      setError(`Date cannot be after ${fmtLabel(max)}`);
      return;
    }
    onChange(currentStr);
    setOpen(false);
  };

  const displayValue = value
    ? new Date(value + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
    : "";

  let portalRoot = document.getElementById("datepicker-portal");
  if (!portalRoot) {
    portalRoot = document.createElement("div");
    portalRoot.id = "datepicker-portal";
    document.body.appendChild(portalRoot);
  }

  return (
    <div className="datepicker-wrap" ref={ref}>
      <div className={`datepicker-trigger ${open ? "datepicker-trigger-active" : ""}`} onClick={() => setOpen(!open)}>
        <span className={displayValue ? "datepicker-value" : "datepicker-placeholder"}>
          {displayValue || placeholder}
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </div>
      {open && createPortal(
        <div className="drum-dropdown" style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 99999 }}>
          <div className="drum-label-row">
            <span className="drum-label">Month</span>
            <span className="drum-label">Day</span>
            <span className="drum-label">Year</span>
          </div>
          <div className="drum-columns">
            <ScrollColumn items={MONTHS} selected={MONTHS[month]} onChange={(v) => setMonth(MONTHS.indexOf(v))} />
            <ScrollColumn items={days} selected={safeDay} onChange={(v) => setDay(v)} />
            <ScrollColumn items={years} selected={year} onChange={(v) => setYear(v)} />
          </div>
          <div className="drum-actions">
            <button type="button" className="drum-btn-cancel" onClick={() => setOpen(false)}>Cancel</button>
            <button type="button" className={`drum-btn-confirm ${isInvalid ? "drum-btn-disabled" : ""}`} onClick={confirm}>Confirm</button>
          </div>
          {error && <p className="drum-error">{error}</p>}
          {value && (
            <button type="button" className="datepicker-clear" onClick={() => { onChange(""); setOpen(false); }}>Clear</button>
          )}
        </div>,
        portalRoot
      )}
    </div>
  );
};

export default DatePicker;
