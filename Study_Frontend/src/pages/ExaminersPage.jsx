import { useState, useEffect, Fragment } from "react";
import { useQuery, useLazyQuery, useMutation } from "@apollo/client/react";
import { useSearchParams } from "react-router-dom";
import { GET_EXAMINERS, GET_EXAMINER_DETAIL, GET_STUDIES_WITH_SITES, GET_SITES, GET_UNASSIGNED_SITES_FOR_EXAMINER, CREATE_EXAMINER, ASSIGN_EXAMINER, UPSERT_CERTIFICATE } from "../Connection/Schema_Acess";
import { useAuth } from "../context/AuthContext";
import ParallaxBg from "../components/ParallaxBg";
import Pagination from "../components/Pagination";
import XFrame from "../components/XFrame";
import Select from "../components/Select";
import DatePicker from "../components/DatePicker";
import AuditLog from "../components/AuditLog";
import { showToast } from "../components/Toast";
import Highlight from "../components/Highlight";
import LocalSearch from "../components/LocalSearch";

const PER_PAGE = 6;
const emptyExaminer = { name: "", role: "Principal_Investigator", cert_study: "", cert_expiry: "", site: "" };

const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
};

const ExaminersPage = () => {
  const { isAdmin } = useAuth();
  const [expanded, setExpanded] = useState(null);
  const [highlight, setHighlight] = useState(null);
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(emptyExaminer);
  const [addError, setAddError] = useState("");
  const [assignExId, setAssignExId] = useState(null);
  const [selectedSite, setSelectedSite] = useState("");
  const [selectedStudyForSite, setSelectedStudyForSite] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [searchParams] = useSearchParams();
  const [xframe, setXframe] = useState(null);
  const [auditLog, setAuditLog] = useState(null);

  const [addCertFor, setAddCertFor] = useState(null);
  const [certStudy, setCertStudy] = useState("");
  const [certExpiry, setCertExpiry] = useState("");
  const [editCertId, setEditCertId] = useState(null);
  const [editCertDate, setEditCertDate] = useState("");
  const [editCertPos, setEditCertPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, sortCol, sortDir]);

  const queryVars = { page, perPage: PER_PAGE, search: debouncedSearch || undefined, sortCol, sortDir };
  const { loading, error, data, refetch } = useQuery(GET_EXAMINERS, { variables: queryVars, fetchPolicy: "cache-first" });
  const [fetchDetail, { data: detailData, loading: detailLoading }] = useLazyQuery(GET_EXAMINER_DETAIL, { fetchPolicy: "cache-first" });
  const [fetchUnassigned, { data: unassignedData }] = useLazyQuery(GET_UNASSIGNED_SITES_FOR_EXAMINER, { fetchPolicy: "cache-first" });

  useEffect(() => {
    if (!editCertId) return;
    const close = (e) => {
      const portal = document.getElementById("datepicker-portal");
      if (portal && portal.contains(e.target)) return;
      setEditCertId(null);
    };
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [editCertId]);

  const [fetchStudies, { data: studiesData }] = useLazyQuery(GET_STUDIES_WITH_SITES);
  const formStudies = studiesData?.studies?.items || [];
  const [fetchSites, { data: sitesData }] = useLazyQuery(GET_SITES);
  const formSites = sitesData?.sites?.items || [];

  const refetchAll = [{ query: GET_EXAMINERS, variables: queryVars }];

  const [createExaminer, { loading: creating }] = useMutation(CREATE_EXAMINER, {
    refetchQueries: refetchAll,
    onCompleted: async (res) => {
      const newId = res?.createExaminer?.examiner_id;
      if (addForm.site && newId) {
        const vars = { site_id: addForm.site, examiner_id: String(newId) };
        try { await assignExaminer({ variables: vars }); } catch (_) {}
      }
      setShowAdd(false); setAddForm(emptyExaminer); setAddError(""); showToast("Examiner created successfully");
    },
    onError: (err) => setAddError(err.message),
  });
  const [assignError, setAssignError] = useState("");
  const [assignExaminer] = useMutation(ASSIGN_EXAMINER, {
    onCompleted: () => { setAssignError(""); showToast("Examiner assigned to site successfully"); refetch(); if (expanded) fetchDetail({ variables: { examiner_id: String(expanded) } }); },
    onError: (err) => { setAssignError(err.message); showToast(err.message, "error"); },
  });
  const [upsertCert] = useMutation(UPSERT_CERTIFICATE, {
    onCompleted: (res) => {
      const cert = res?.upsertCertificate;
      if (cert?.study_end_date && cert?.expiry_date) {
        const certDate = new Date(cert.expiry_date), endDate = new Date(cert.study_end_date);
        if (certDate < endDate) showToast(`⚠️ Certificate expires before study "${cert.study_name}" ends (${fmtDate(cert.study_end_date)})`, "error");
        else showToast(`Certificate added — valid through study end date`, "success");
      } else showToast("Certificate added");
      setAddCertFor(null); setCertStudy(""); setCertExpiry("");
      if (expanded) fetchDetail({ variables: { examiner_id: String(expanded) } });
    },
    onError: (err) => showToast(err.message, "error"),
  });

  const examiners = data?.examiners?.items || [];
  const totalPages = data?.examiners?.totalPages || 1;
  const total = data?.examiners?.total || 0;
  const detail = detailData?.examinerDetail?.examiner;
  const allSites = unassignedData?.unassignedSitesForExaminer || [];

  const handleExpand = (exId) => {
    if (expanded === exId) { setExpanded(null); return; }
    setExpanded(exId);
    setAssignExId(null); setHighlight(null); setAddCertFor(null);
    fetchDetail({ variables: { examiner_id: String(exId) } });
  };

  useEffect(() => {
    const expandId = searchParams.get("expand");
    const urlSearch = searchParams.get("search");
    if (expandId && data) {
      const numId = Number(expandId);
      const idx = examiners.findIndex((e) => e.examiner_id == numId);
      if (idx !== -1) {
        setExpanded(numId); setHighlight(numId);
        fetchDetail({ variables: { examiner_id: expandId } });
        setTimeout(() => setHighlight(null), 2500);
      } else if (urlSearch && search !== urlSearch) {
        setSearch(urlSearch);
      }
    }
  }, [searchParams, data]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const handleCreate = () => {
    setAddError("");
    const roleName = addForm.role.replace("_", " ");
    if (examiners.some(e => e.name.toLowerCase() === addForm.name.toLowerCase() && e.role.toLowerCase() === roleName.toLowerCase())) {
      setAddError(`Examiner "${addForm.name}" with role "${roleName}" already exists`); return;
    }
    if (addForm.cert_study && !addForm.cert_expiry) { setAddError("Certificate expiry date is required"); return; }
    const vars = { name: addForm.name, role: addForm.role };
    if (addForm.cert_study && addForm.cert_expiry) {
      vars.cert_study = addForm.cert_study;
      vars.cert_expiry = addForm.cert_expiry;
    }
    createExaminer({ variables: vars });
  };

  if (loading && !data) return <p className="status-loading">Loading…</p>;
  if (error && !data) return <p className="status-error">Error: {error.message}</p>;

  const sortIcon = (col) => sortCol === col ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  return (
    <>
      <div className="search-bar">
        <LocalSearch
          type="examiners"
          placeholder="Search examiners…"
          onSelect={(item) => {
            setSearch(item.name);
            setExpanded(item.examiner_id);
            setHighlight(item.examiner_id);
            fetchDetail({ variables: { examiner_id: String(item.examiner_id) } });
            setTimeout(() => setHighlight(null), 2500);
          }}
        />
      </div>

      {isAdmin && (
        <div className="add-section" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => { setShowAdd(!showAdd); setAddError(""); if (!showAdd) { fetchStudies(); fetchSites(); } }}
            className={`add-toggle ${showAdd ? "add-toggle-close" : "add-toggle-open"}`}>
            {showAdd ? "✕ Cancel" : "+ Add Examiner"}
          </button>
          <button className="history-btn" onClick={() => setAuditLog({ type: "examiner", title: "Examiner History" })}>
            📜 History
          </button>
        </div>
      )}

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th className="sortable-th" onClick={() => handleSort("name")}>Name{sortIcon("name")}</th>
              <th className="sortable-th" onClick={() => handleSort("role")}>Role{sortIcon("role")}</th>
              <th className="sortable-th" onClick={() => handleSort("study_status")}>Status{sortIcon("study_status")}</th>
            </tr>
          </thead>
          <tbody>
            {examiners.map((ex) => {
              const isExpanded = expanded === ex.examiner_id;
              const exDetail = isExpanded && detail?.examiner_id == ex.examiner_id ? detail : null;
              const exCerts = exDetail?.certificates || [];
              const exStudies = exDetail?.studies || [];
              const exSites = exDetail?.sites || [];
              const workStatus = ex.study_status;
              return (
              <Fragment key={ex.examiner_id}>
                <tr className={highlight && highlight !== ex.examiner_id ? "row-dimmed" : highlight === ex.examiner_id ? "row-highlight" : ""}
                  onClick={() => handleExpand(ex.examiner_id)}>
                  <td className="font-medium"><Highlight text={ex.name} query={search} /></td>
                  <td><span className="badge badge-role"><Highlight text={ex.role} query={search} /></span></td>
                  <td><span className={`badge ${workStatus === "Working" ? "badge-active" : "badge-closed"}`}>{workStatus}</span></td>
                </tr>
                {isExpanded && (
                  <tr key={`${ex.examiner_id}-exp`} className="expand-row">
                    <td colSpan={3}>
                      {detailLoading && !exDetail ? <p className="status-loading">Loading details…</p> : (
                        <div className="flex gap-6 flex-wrap">
                          <div className="flex-1 min-w-[200px]">
                            <p className="nested-label">Certificates ({exCerts.length})</p>
                            {exCerts.map((c) => {
                              const daysLeft = Math.ceil((new Date(c.expiry_date) - new Date()) / 86400000);
                              const isExpired = daysLeft <= 0;
                              const isWarning = daysLeft > 0 && daysLeft <= 60;
                              const isAssigned = !isExpired && exStudies.some(s => s.protocol_id === c.protocol_id);
                              const isEditing = editCertId === c.protocol_id;
                              return (
                              <div className="nested-item" key={c.protocol_id}
                                style={isExpired ? { borderLeft: "3px solid #ef4444", background: "rgba(239,68,68,0.06)" } : isWarning ? { borderLeft: "3px solid #eab308", background: "rgba(234,179,8,0.06)" } : {}}>
                                <div className="flex items-center justify-between">
                                  <span className="nested-item-name" style={{ cursor: "pointer" }}
                                    onClick={(e) => { e.stopPropagation(); const s = exStudies.find(s => s.protocol_id === c.protocol_id); if (s) setXframe({ type: "study", data: s }); }}>
                                    {c.study_name}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`badge ${isExpired ? "badge-closed" : isWarning ? "" : "badge-planned"}`}
                                      style={{ cursor: isAdmin ? "pointer" : "default", ...(isWarning ? { background: "#fef3c7", color: "#92400e", borderColor: "#fde68a" } : {}) }}
                                      title={isAdmin ? "Click to change expiry date" : `Expires ${c.expiry_date}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isAdmin) return;
                                        if (isEditing) { setEditCertId(null); return; }
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setEditCertPos({ top: rect.bottom + 4, left: rect.left });
                                        setEditCertId(c.protocol_id); setEditCertDate(c.expiry_date);
                                      }}>
                                      📜 {c.expiry_date}{isExpired ? " (expired)" : isWarning ? ` (${daysLeft}d)` : ""}
                                    </span>
                                    <span className={`badge ${isAssigned ? "badge-active" : "badge-planned"}`}>{isAssigned ? "Working" : "Certified"}</span>
                                  </div>
                                </div>
                              </div>
                              );
                            })}
                            {exCerts.length === 0 && <p className="no-data">No certificates</p>}
                            {isAdmin && addCertFor === ex.examiner_id && (
                              <div className="inline-assign" style={{ flexDirection: "column", alignItems: "stretch", marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                                <p className="xframe-field-label">Add Certificate</p>
                                <Select className="cselect-sm" value={certStudy} onChange={(v) => setCertStudy(v)} placeholder="— Select Study —" options={
                                  formStudies.filter(s => !exCerts.some(c => c.protocol_id === s.protocol_id)).map(s => ({ value: s.protocol_id, label: s.study_name }))
                                } />
                                {certStudy && <DatePicker value={certExpiry} placeholder="Expiry date" min={(() => { const s = formStudies.find(st => st.protocol_id === certStudy); return s?.start_date || undefined; })()} onChange={(v) => setCertExpiry(v)} />}
                                <div className="flex gap-2 mt-1">
                                  <button className="form-submit-sm" disabled={!certStudy || !certExpiry}
                                    onClick={() => upsertCert({ variables: { examiner_id: String(ex.examiner_id), protocol_id: certStudy, expiry_date: certExpiry } })}>
                                    Add
                                  </button>
                                  <button className="add-toggle add-toggle-close text-xs" onClick={() => { setAddCertFor(null); setCertStudy(""); setCertExpiry(""); }}>Cancel</button>
                                </div>
                              </div>
                            )}
                            {isAdmin && addCertFor !== ex.examiner_id && (
                              <button className="add-toggle add-toggle-open mt-2 text-xs" onClick={(e) => { e.stopPropagation(); setAddCertFor(ex.examiner_id); setCertStudy(""); setCertExpiry(""); fetchStudies(); }}>+ Add Certificate</button>
                            )}
                          </div>
                          <div className="flex-1 min-w-[200px]">
                            <p className="nested-label">Sites ({exSites.length})</p>
                            {exSites.map((s) => (
                              <div className="nested-item nested-link" key={s.site_id} onClick={(e) => { e.stopPropagation(); setXframe({ type: "site", data: s }); }}>
                                <div className="flex items-center justify-between">
                                  <span className="nested-item-name">{s.site_name}</span>
                                  <span className={`badge badge-${s.status?.toLowerCase()}`}>{s.status}</span>
                                </div>
                                <p className="nested-item-sub">{[s.city, s.country].filter(Boolean).join(", ")}</p>
                                {(s.studies || []).length > 0 && (
                                  <div className="tag-list">
                                    {s.studies.map(st => (
                                      <span className="tag tag-link" key={st.protocol_id} onClick={(e) => { e.stopPropagation(); setXframe({ type: "study", data: st }); }}>
                                        {st.study_name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                            {exSites.length === 0 && <p className="no-data">No sites</p>}
                            {isAdmin && assignExId === ex.examiner_id && (
                              <div className="inline-assign" style={{ flexDirection: "column", alignItems: "stretch" }}>
                                <Select className="cselect-sm" value={selectedSite} onChange={(v) => { setSelectedSite(v); setSelectedStudyForSite(""); }} placeholder="— Select Site —" options={
                                  allSites.filter(s => s.status !== "Closed" && !exSites.some(es => es.site_id == s.site_id)).map(s => (
                                    { value: String(s.site_id), label: s.site_name, sub: [s.city, s.country].filter(Boolean).join(", ") }
                                  ))
                                } />
                                {selectedSite && (() => {
                                  const pickedSite = allSites.find(s => String(s.site_id) === selectedSite);
                                  const now = new Date();
                                  const siteStudies = (pickedSite?.studies || []).filter(st => {
                                    if (st.status === "Completed") return false;
                                    const cert = exCerts.find(c => c.protocol_id === st.protocol_id);
                                    if (!cert) return false;
                                    if (new Date(cert.expiry_date) < now) return false;
                                    if (st.start_date && new Date(st.start_date) > now) return false;
                                    if (st.end_date && new Date(st.end_date) < now) return false;
                                    return true;
                                  });
                                  return siteStudies.length > 0 ? (
                                    <div style={{ marginTop: 6 }}>
                                      <p className="xframe-field-label">Associate with Study (optional)</p>
                                      <Select className="cselect-sm mt-1" value={selectedStudyForSite} onChange={(v) => setSelectedStudyForSite(v)} placeholder="— None —" options={
                                        siteStudies.map(st => ({ value: st.protocol_id, label: st.study_name }))
                                      } />
                                    </div>
                                  ) : null;
                                })()}
                                <button className="form-submit-sm" style={{ marginTop: 6 }} disabled={!selectedSite}
                                  onClick={() => {
                                    const vars = { site_id: selectedSite, examiner_id: String(ex.examiner_id) };
                                    if (selectedStudyForSite) vars.protocol_id = selectedStudyForSite;
                                    assignExaminer({ variables: vars });
                                    setSelectedSite(""); setSelectedStudyForSite(""); setAssignExId(null);
                                  }}>
                                  Assign
                                </button>
                              </div>
                            )}
                            {isAdmin && assignExId !== ex.examiner_id && (
                              <button className="add-toggle add-toggle-open mt-2 text-xs" onClick={(e) => { e.stopPropagation(); setAssignExId(ex.examiner_id); setSelectedSite(""); setSelectedStudyForSite(""); fetchUnassigned({ variables: { examiner_id: String(ex.examiner_id) } }); }}>+ Assign to Site</button>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} total={total} perPage={PER_PAGE} onPageChange={setPage} />

      {xframe && <XFrame type={xframe.type} data={xframe.data} allStudies={detail?.studies || []} allSites={detail?.sites || []} allExaminers={examiners} onClose={() => setXframe(null)} onOpenXFrame={(type, d) => setXframe({ type, data: d })} />}

      {auditLog && <AuditLog entityType={auditLog.type} entityId={auditLog.id} title={auditLog.title} onClose={() => setAuditLog(null)} />}

      {editCertId && (
        <>
          <div className="status-backdrop" onClick={() => setEditCertId(null)} />
          <div className="status-dropdown" style={{ top: editCertPos.top, left: editCertPos.left, minWidth: 220 }}>
            <DatePicker value={editCertDate} min={(() => { const c = detail?.certificates?.find(c => c.protocol_id === editCertId); return c?.expiry_date; })()} placeholder="New expiry date" onChange={(v) => setEditCertDate(v)} />
            <div className="flex gap-2 mt-1">
              <button className="form-submit-sm" style={{ flex: 1 }} disabled={!editCertDate || editCertDate <= (detail?.certificates?.find(c => c.protocol_id === editCertId)?.expiry_date || "")}
                onClick={() => { upsertCert({ variables: { examiner_id: String(expanded), protocol_id: editCertId, expiry_date: editCertDate } }); setEditCertId(null); }}>
                Save
              </button>
              <button className="add-toggle add-toggle-close text-xs" onClick={() => setEditCertId(null)}>Cancel</button>
            </div>
          </div>
        </>
      )}

      {showAdd && (
        <div className="xframe-overlay" onClick={() => setShowAdd(false)}>
          <div className="xframe-panel xframe-panel-glass" onClick={(e) => e.stopPropagation()}>
            <div className="xframe-panel-bg">
              <ParallaxBg theme="xf_examiner" opacity={0.5}>
                <div className="xframe-panel-inner">
                  <div className="xframe-header">
                    <span className="xframe-type-badge">New Examiner</span>
                    <button className="xframe-close" onClick={() => setShowAdd(false)}>✕</button>
                  </div>
                  <div className="xframe-body">
                    <h2 className="xframe-title">Create Examiner</h2>
                    <div className="xframe-form-stack">
                <label className="xframe-field-label">Name <span className="req">*</span></label>
                <input placeholder="Name" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} className="form-input w-full" />
                <label className="xframe-field-label">Role <span className="req">*</span></label>
                <Select value={addForm.role} onChange={(v) => setAddForm({ ...addForm, role: v })} options={[
                  { value: "Principal_Investigator", label: "Principal Investigator" },
                  { value: "Sub_Investigator", label: "Sub Investigator" },
                ]} />
                <p className="text-xs mt-2" style={{ color: "#64748b" }}>Optionally add a certificate</p>
                <label className="xframe-field-label">Study Certificate</label>
                <Select value={addForm.cert_study} onChange={(v) => setAddForm({ ...addForm, cert_study: v, cert_expiry: "" })} placeholder="— None —" options={
                  formStudies.map(s => ({ value: s.protocol_id, label: s.study_name, sub: s.protocol_id }))
                } />
                {addForm.cert_study && (
                  <>
                    <label className="xframe-field-label">Certificate Expiry Date <span className="req">*</span></label>
                    <DatePicker value={addForm.cert_expiry} placeholder="Select expiry date" min={(() => { const s = formStudies.find(st => st.protocol_id === addForm.cert_study); return s?.start_date || undefined; })()} onChange={(v) => setAddForm({ ...addForm, cert_expiry: v })} />
                  </>
                )}
                <p className="text-xs mt-2" style={{ color: "#64748b" }}>Optionally assign to a site</p>
                <label className="xframe-field-label">Site</label>
                <Select value={addForm.site} onChange={(v) => setAddForm({ ...addForm, site: v })} placeholder="— None —" options={
                  formSites.map(s => ({ value: String(s.site_id), label: s.site_name, sub: [s.city, s.country].filter(Boolean).join(", ") }))
                } />
                {addError && <p className="form-error">{addError}</p>}
                <button disabled={!addForm.name || (addForm.cert_study && !addForm.cert_expiry) || creating}
                  onClick={handleCreate} className="form-submit">
                  {creating ? "Creating…" : "Create Examiner"}
                </button>
                    </div>
                  </div>
                </div>
              </ParallaxBg>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ExaminersPage;
