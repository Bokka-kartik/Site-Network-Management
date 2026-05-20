import { useState } from "react";
import { useQuery } from "@apollo/client/react";
import { GET_AUDIT_LOGS } from "../Connection/Schema_Acess";
import ParallaxBg from "./ParallaxBg";

const fmtTime = (d) => {
  if (!d) return "—";
  const dt = new Date(d.includes("T") ? d : d + "Z");
  return dt.toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const actionIcon = (action) => {
  if (action.startsWith("Created")) return "🟢";
  if (action.startsWith("Assigned") || action.startsWith("Added")) return "🔵";
  if (action.startsWith("Unassigned") || action.startsWith("Removed")) return "🔴";
  if (action.startsWith("Updated")) return "🟡";
  return "⚪";
};

const FILTERS = [
  { key: "created", label: "Created", match: (a) => a.startsWith("Created") },
  { key: "assigned", label: "Assigned", match: (a) => a.startsWith("Assigned") || a.startsWith("Added") || a.startsWith("Unassigned") || a.startsWith("Removed") },
  { key: "updated", label: "Updated", match: (a) => a.startsWith("Updated") },
];

const AuditLog = ({ entityType, entityId, title, onClose }) => {
  const { loading, error, data } = useQuery(GET_AUDIT_LOGS, {
    variables: { entity_type: entityType || undefined, entity_id: entityId || undefined },
    fetchPolicy: "cache-first",
  });
  const [filter, setFilter] = useState(null);

  const logs = data?.auditLogs || [];
  const filtered = filter
    ? logs.filter((l) => FILTERS.find((f) => f.key === filter)?.match(l.action))
    : logs;

  return (
    <div className="xframe-overlay" onClick={onClose}>
      <div className="xframe-panel xframe-panel-glass" onClick={(e) => e.stopPropagation()}>
        <div className="xframe-panel-bg">
          <ParallaxBg theme="audit" opacity={0.65}>
            <div className="xframe-panel-inner">
              <div className="xframe-header">
                <span className="xframe-type-badge" style={{cursor:"default"}}>History</span>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {FILTERS.map((f) => (
                      <button key={f.key}
                        className={`audit-filter-btn${filter === f.key ? " audit-filter-active" : ""}`}
                        onClick={() => setFilter(filter === f.key ? null : f.key)}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <button className="xframe-close" onClick={onClose}>✕</button>
                </div>
              </div>
              <div className="xframe-body">
                <h2 className="xframe-title">{title || "Audit Log"}</h2>
                {loading && <p className="status-loading">Loading…</p>}
                {error && <p className="form-error">{error.message}</p>}
                {!loading && filtered.length === 0 && <p className="no-data">{filter ? `No ${filter} entries` : "No history yet"}</p>}
                <div className="audit-timeline">
                  {filtered.map((log) => (
                    <div key={log.log_id} className="audit-entry">
                      <div className="audit-dot">{actionIcon(log.action)}</div>
                      <div className="audit-content">
                        <div className="audit-action">{log.action}</div>
                        <div className="audit-details">{log.details}</div>
                        <div className="audit-meta">
                          <span className="audit-user">{log.performed_by}</span>
                          <span className="audit-time">{fmtTime(log.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ParallaxBg>
        </div>
      </div>
    </div>
  );
};

export default AuditLog;
