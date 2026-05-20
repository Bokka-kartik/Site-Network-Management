import { useState, useEffect, Fragment } from "react";
import { useQuery, useLazyQuery, useMutation } from "@apollo/client/react";
import { useSearchParams } from "react-router-dom";
import { GET_SITES, GET_SITE_DETAIL, GET_UNASSIGNED_FOR_SITE, CREATE_SITE, ASSIGN_STUDY_TO_SITE, ASSIGN_EXAMINER, CREATE_EXAMINER, UPDATE_SITE } from "../Connection/Schema_Acess";
import { useAuth } from "../context/AuthContext";
import ParallaxBg from "../components/ParallaxBg";
import Pagination from "../components/Pagination";
import XFrame from "../components/XFrame";
import Select from "../components/Select";
import AuditLog from "../components/AuditLog";
import { showToast } from "../components/Toast";
import Highlight from "../components/Highlight";
import LocalSearch from "../components/LocalSearch";

const PER_PAGE = 6;
const emptySite = { site_name: "", city: "", country: "", examiner_id: "", new_examiner_name: "", new_examiner_role: "Principal_Investigator", examiner_mode: "existing" };

const SitesPage = () => {
  const { isAdmin } = useAuth();
  const [expanded, setExpanded] = useState(null);
  const [highlight, setHighlight] = useState(null);
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(emptySite);
  const [addError, setAddError] = useState("");
  const [addStudyFor, setAddStudyFor] = useState(null);
  const [selectedStudy, setSelectedStudy] = useState("");
  const [studyError, setStudyError] = useState("");
  const [assignSiteId, setAssignSiteId] = useState(null);
  const [selectedExaminer, setSelectedExaminer] = useState("");
  const [selectedStudyForExaminer, setSelectedStudyForExaminer] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [searchParams] = useSearchParams();
  const [xframe, setXframe] = useState(null);
  const [auditLog, setAuditLog] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, sortCol, sortDir]);

  const queryVars = { page, perPage: PER_PAGE, search: debouncedSearch || undefined, sortCol, sortDir };
  const { loading, error, data, refetch } = useQuery(GET_SITES, { variables: queryVars, fetchPolicy: "cache-first" });
  const [fetchDetail, { data: detailData, loading: detailLoading }] = useLazyQuery(GET_SITE_DETAIL, { fetchPolicy: "cache-first" });
  const [fetchUnassigned, { data: unassignedData }] = useLazyQuery(GET_UNASSIGNED_FOR_SITE, { fetchPolicy: "cache-first" });

  const refetchAll = [{ query: GET_SITES, variables: queryVars }];

  const [createSite, { loading: creating }] = useMutation(CREATE_SITE, {
    refetchQueries: refetchAll,
    onCompleted: () => { setShowAdd(false); setAddForm(emptySite); setAddError(""); showToast("Site created successfully"); },
    onError: (err) => setAddError(err.message),
  });
  const [createExaminer] = useMutation(CREATE_EXAMINER, {
    refetchQueries: refetchAll,
    onError: (err) => setAddError(err.message),
  });
  const [assignStudyToSite] = useMutation(ASSIGN_STUDY_TO_SITE, {
    onCompleted: () => { setAddStudyFor(null); setSelectedStudy(""); setStudyError(""); showToast("Study assigned successfully"); refetch(); if (expanded) fetchDetail({ variables: { site_id: String(expanded) } }); },
    onError: (err) => setStudyError(err.message),
  });
  const [assignExaminer] = useMutation(ASSIGN_EXAMINER, {
    onCompleted: () => { showToast("Examiner assigned successfully"); refetch(); if (expanded) fetchDetail({ variables: { site_id: String(expanded) } }); },
    onError: (err) => showToast(err.message, "error"),
  });
  const [updateSite] = useMutation(UPDATE_SITE, {
    onCompleted: () => { showToast("Status updated"); refetch(); if (expanded) fetchDetail({ variables: { site_id: String(expanded) } }); },
    onError: (err) => showToast(err.message, "error"),
  });
  const [statusEdit, setStatusEdit] = useState(null);
  const [statusPos, setStatusPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!statusEdit) return;
    const close = (e) => {
      const portal = document.getElementById("datepicker-portal");
      if (portal && portal.contains(e.target)) return;
      setStatusEdit(null);
    };
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [statusEdit]);
  const [addExaminerFor, setAddExaminerFor] = useState(null);
  const [selectedNewExaminer, setSelectedNewExaminer] = useState("");

  const sites = data?.sites?.items || [];
  const totalPages = data?.sites?.totalPages || 1;
  const total = data?.sites?.total || 0;
  const detail = detailData?.siteDetail?.site;
  const allStudies = unassignedData?.unassignedForSite?.studies || [];
  const allExaminers = unassignedData?.unassignedForSite?.examiners || [];

  const handleExpand = (siteId) => {
    if (statusEdit) { setStatusEdit(null); return; }
    if (expanded === siteId) { setExpanded(null); return; }
    setExpanded(siteId);
    setAddStudyFor(null); setAssignSiteId(null); setHighlight(null);
    fetchDetail({ variables: { site_id: String(siteId) } });
  };

  useEffect(() => {
    const expandId = searchParams.get("expand");
    const urlSearch = searchParams.get("search");
    if (expandId && data) {
      const numId = Number(expandId);
      const idx = sites.findIndex((s) => s.site_id == numId);
      if (idx !== -1) {
        setExpanded(numId); setHighlight(numId);
        fetchDetail({ variables: { site_id: expandId } });
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

  const handleCreate = async () => {
    setAddError("");
    let exId = null;
    if (addForm.examiner_mode === "existing" && addForm.examiner_id) {
      exId = addForm.examiner_id;
    } else if (addForm.examiner_mode === "new" && addForm.new_examiner_name) {
      try {
        const res = await createExaminer({ variables: { name: addForm.new_examiner_name, role: addForm.new_examiner_role } });
        exId = res?.data?.createExaminer?.examiner_id ? String(res.data.createExaminer.examiner_id) : null;
      } catch { return; }
    }
    createSite({ variables: { site_name: addForm.site_name, city: addForm.city, country: addForm.country, examiner_id: exId } });
  };

  if (loading && !data) return <p className="status-loading">Loading…</p>;
  if (error && !data) return <p className="status-error">Error: {error.message}</p>;

  const sortIcon = (col) => sortCol === col ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  return (
    <>
      <div className="search-bar">
        <LocalSearch
          type="sites"
          placeholder="Search sites…"
          onSelect={(item) => {
            setSearch(item.site_name);
            setExpanded(item.site_id);
            setHighlight(item.site_id);
            fetchDetail({ variables: { site_id: String(item.site_id) } });
            setTimeout(() => setHighlight(null), 2500);
          }}
        />
      </div>

      {isAdmin && (
        <div className="add-section" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => { setShowAdd(!showAdd); setAddError(""); }}
            className={`add-toggle ${showAdd ? "add-toggle-close" : "add-toggle-open"}`}>
            {showAdd ? "✕ Cancel" : "+ Add Site"}
          </button>
          <button className="history-btn" onClick={() => setAuditLog({ type: "site", title: "Site History" })}>
            📜 History
          </button>
        </div>
      )}

      <div className={`data-table-wrap${statusEdit ? " status-open" : ""}`}>
        <table className="data-table">
          <thead>
            <tr>
              <th className="sortable-th" onClick={() => handleSort("site_name")}>Site Name{sortIcon("site_name")}</th>
              <th className="sortable-th" onClick={() => handleSort("city")}>City{sortIcon("city")}</th>
              <th className="sortable-th" onClick={() => handleSort("country")}>Country{sortIcon("country")}</th>
              <th className="sortable-th" onClick={() => handleSort("status")}>Status{sortIcon("status")}</th>
            </tr>
          </thead>
          <tbody>
            {sites.map((site) => {
              const isExpanded = expanded === site.site_id;
              const siteDetail = isExpanded && detail?.site_id == site.site_id ? detail : null;
              const siteStudies = siteDetail?.studies || [];
              const siteExaminers = siteDetail?.examiners || [];

              return (
              <Fragment key={site.site_id}>
                <tr className={highlight && highlight !== site.site_id ? "row-dimmed" : highlight === site.site_id ? "row-highlight" : ""}
                  onClick={() => handleExpand(site.site_id)}>
                  <td className="font-medium"><Highlight text={site.site_name} query={search} /></td>
                  <td><Highlight text={site.city} query={search} /></td>
                  <td><Highlight text={site.country} query={search} /></td>
                  <td>
                    {isAdmin ? (
                      <span className={`badge badge-${site.status?.toLowerCase()}`} style={{ cursor: "pointer" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (statusEdit === site.site_id) { setStatusEdit(null); return; }
                          const rect = e.currentTarget.getBoundingClientRect();
                          setStatusPos({ top: rect.bottom + 4, left: rect.right - 120 });
                          setStatusEdit(site.site_id);
                        }}>
                        {site.status} ▾
                      </span>
                    ) : (
                      <span className={`badge badge-${site.status?.toLowerCase()}`}>{site.status}</span>
                    )}
                  </td>
                </tr>
                {isExpanded && (
                  <tr key={`${site.site_id}-exp`} className="expand-row">
                    <td colSpan={4}>
                      {detailLoading && !siteDetail ? <p className="status-loading">Loading details…</p> : (
                        <div className="flex gap-6 flex-wrap">
                          <div className="flex-1 min-w-[200px]">
                            <p className="nested-label">Studies ({siteStudies.length})</p>
                            {siteStudies.map((st) => (
                              <div className="nested-item nested-link" key={st.protocol_id} onClick={(e) => { e.stopPropagation(); setXframe({ type: "study", data: st }); }}>
                                <div className="flex items-center justify-between">
                                  <span className="nested-item-name">{st.study_name}</span>
                                  <span className={`badge badge-${st.status?.toLowerCase()}`}>{st.status}</span>
                                </div>
                                <p className="nested-item-sub">{st.sponsor} · {st.protocol_id}</p>
                              </div>
                            ))}
                            {siteStudies.length === 0 && <p className="no-data">No studies</p>}
                          </div>
                          <div className="flex-1 min-w-[200px]">
                            <p className="nested-label">Examiners ({siteExaminers.length})</p>
                            {siteExaminers.map((ex) => (
                              <div className="nested-item nested-link" key={ex.examiner_id} onClick={(e) => { e.stopPropagation(); setXframe({ type: "examiner", data: ex }); }}>
                                <span className="nested-item-name">{ex.name}</span>
                                <p className="nested-item-sub">{ex.role}</p>
                                {(ex.studies || []).length > 0 && (
                                  <div className="tag-list">
                                    {ex.studies.map(st => (
                                      <span className="tag tag-link" key={st.protocol_id} onClick={(e) => { e.stopPropagation(); setXframe({ type: "study", data: st }); }}>
                                        {st.study_name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                            {siteExaminers.length === 0 && <p className="no-data">No examiners</p>}
                            {isAdmin && assignSiteId === site.site_id && (
                              <div className="inline-assign">
                                {siteStudies.length > 0 && (
                                  <Select className="cselect-sm" value={selectedStudyForExaminer} onChange={(v) => { setSelectedStudyForExaminer(v); setSelectedExaminer(""); }} placeholder="— Select Study —" options={
                                    siteStudies.map(st => ({ value: st.protocol_id, label: st.study_name }))
                                  } />
                                )}
                                <Select className="cselect-sm" value={selectedExaminer} onChange={(v) => setSelectedExaminer(v)} placeholder="— Select Examiner —" options={
                                  (() => {
                                    if (!selectedStudyForExaminer) return [];
                                    const study = siteStudies.find(s => s.protocol_id === selectedStudyForExaminer);
                                    const alreadyAssigned = study?.assigned_examiner_ids || [];
                                    return siteExaminers.filter(e =>
                                      !alreadyAssigned.includes(String(e.examiner_id)) &&
                                      (e.certificates || []).some(c => c.protocol_id === selectedStudyForExaminer && new Date(c.expiry_date) >= new Date())
                                    ).map(e => ({ value: String(e.examiner_id), label: e.name, sub: e.role }));
                                  })()
                                } />
                                <button className="form-submit-sm" disabled={!selectedExaminer || !selectedStudyForExaminer}
                                  onClick={() => { assignExaminer({ variables: { protocol_id: selectedStudyForExaminer, site_id: String(site.site_id), examiner_id: selectedExaminer } }); setSelectedExaminer(""); setSelectedStudyForExaminer(""); setAssignSiteId(null); }}>
                                  Assign
                                </button>
                              </div>
                            )}
                            {isAdmin && assignSiteId !== site.site_id && (
                              <button className="add-toggle add-toggle-open mt-2 text-xs" onClick={(e) => { e.stopPropagation(); setAssignSiteId(site.site_id); setSelectedStudyForExaminer(""); }}>+ Assign Examiner to Study</button>
                            )}
                            {isAdmin && addExaminerFor === site.site_id && (
                              <div className="inline-assign" style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                                <Select className="cselect-sm" value={selectedNewExaminer} onChange={(v) => setSelectedNewExaminer(v)} placeholder="— Select Examiner —" options={
                                  allExaminers.filter(e => !siteExaminers.some(se => se.examiner_id == e.examiner_id)).map(e => (
                                    { value: String(e.examiner_id), label: e.name, sub: e.role }
                                  ))
                                } />
                                <button className="form-submit-sm" disabled={!selectedNewExaminer}
                                  onClick={() => { assignExaminer({ variables: { site_id: String(site.site_id), examiner_id: selectedNewExaminer } }); setSelectedNewExaminer(""); setAddExaminerFor(null); }}>
                                  Add
                                </button>
                                <button className="add-toggle add-toggle-close text-xs" onClick={() => { setAddExaminerFor(null); setSelectedNewExaminer(""); }}>Cancel</button>
                              </div>
                            )}
                            {isAdmin && addExaminerFor !== site.site_id && (
                              <button className="add-toggle add-toggle-open mt-2 text-xs" onClick={(e) => { e.stopPropagation(); setAddExaminerFor(site.site_id); setSelectedNewExaminer(""); fetchUnassigned({ variables: { site_id: String(site.site_id) } }); }}>+ Add Examiner to Site</button>
                            )}
                          </div>
                        </div>
                      )}
                      {isAdmin && siteDetail && addStudyFor === site.site_id && (
                        <div className="edit-inline" onClick={(e) => e.stopPropagation()} style={{ marginTop: 12 }}>
                          <p className="nested-label">Assign Study</p>
                          <div className="add-form-grid">
                            <Select value={selectedStudy} onChange={(v) => setSelectedStudy(v)} placeholder="— Select Study —" options={
                              allStudies.filter(s => !siteStudies.some(st => st.protocol_id === s.protocol_id)).map(s => (
                                { value: s.protocol_id, label: s.study_name, sub: s.protocol_id }
                              ))
                            } />
                          </div>
                          {studyError && <p className="form-error">{studyError}  </p>}
                          <div className="flex gap-2 mt-2">
                            <button className="form-submit-sm" disabled={!selectedStudy}
                              onClick={() => { setStudyError(""); assignStudyToSite({ variables: { protocol_id: selectedStudy, site_id: String(site.site_id) } }); }}>
                              Assign
                            </button>
                            <button className="add-toggle add-toggle-close text-xs" onClick={() => { setAddStudyFor(null); setStudyError(""); }}>Cancel</button>
                          </div>
                        </div>
                      )}
                      {isAdmin && siteDetail && addStudyFor !== site.site_id && (
                        <button className="add-toggle add-toggle-open text-xs mt-3" onClick={(e) => { e.stopPropagation(); setAddStudyFor(site.site_id); setSelectedStudy(""); setStudyError(""); fetchUnassigned({ variables: { site_id: String(site.site_id) } }); }}>+ Assign Study</button>
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

      {xframe && <XFrame type={xframe.type} data={xframe.data} allStudies={detail?.studies || allStudies} allSites={[...(detail ? [detail] : []), ...sites]} allExaminers={detail?.examiners || allExaminers} onClose={() => setXframe(null)} onOpenXFrame={(type, d) => setXframe({ type, data: d })} />}

      {auditLog && <AuditLog entityType={auditLog.type} entityId={auditLog.id} title={auditLog.title} onClose={() => setAuditLog(null)} />}

      {statusEdit && (
        <>
          <div className="status-backdrop" onClick={() => setStatusEdit(null)} />
          <div className="status-dropdown" style={{ top: statusPos.top, left: statusPos.left }}>
            {["Planned", "Active", "Closed"].map(s => (
              <span key={s} className={`status-option badge badge-${s.toLowerCase()}`}
                onClick={() => { updateSite({ variables: { site_id: String(statusEdit), status: s } }); setStatusEdit(null); }}>
                {s}
              </span>
            ))}
          </div>
        </>
      )}

      {showAdd && (
        <div className="xframe-overlay" onClick={() => setShowAdd(false)}>
          <div className="xframe-panel xframe-panel-glass" onClick={(e) => e.stopPropagation()}>
            <div className="xframe-panel-bg">
              <ParallaxBg theme="xf_site" opacity={0.5}>
                <div className="xframe-panel-inner">
                  <div className="xframe-header">
                    <span className="xframe-type-badge">New Site</span>
                    <button className="xframe-close" onClick={() => setShowAdd(false)}>✕</button>
                  </div>
                  <div className="xframe-body">
                    <h2 className="xframe-title">Create Site</h2>
                    <div className="xframe-form-stack">
                <label className="xframe-field-label" htmlFor="1">Site Name <span className="req">*</span></label>
                <input id="1" placeholder="Site Name" value={addForm.site_name} onChange={(e) => setAddForm({ ...addForm, site_name: e.target.value })} className="form-input w-full" />
                <label className="xframe-field-label" htmlFor="2">City</label>
                <input  id="2"placeholder="City" value={addForm.city} onChange={(e) => setAddForm({ ...addForm, city: e.target.value })} className="form-input w-full" />
                <label className="xframe-field-label" htmlFor="3">Country</label>
                <input id="3" placeholder="Country" value={addForm.country} onChange={(e) => setAddForm({ ...addForm, country: e.target.value })} className="form-input w-full" />
                <label className="xframe-field-label" htmlFor="4">Examiner <span style={{ color: "#94a3b8", fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
                <div className="flex gap-2 mb-1" id="4">
                  <button type="button" className={`add-toggle text-xs ${addForm.examiner_mode === "existing" ? "add-toggle-open" : "add-toggle-close"}`}
                    onClick={() => setAddForm({ ...addForm, examiner_mode: "existing" })}>Existing</button>
                  <button type="button" className={`add-toggle text-xs ${addForm.examiner_mode === "new" ? "add-toggle-open" : "add-toggle-close"}`}
                    onClick={() => setAddForm({ ...addForm, examiner_mode: "new" })}>New</button>
                </div>
                {addForm.examiner_mode === "existing" ? (
                  <Select value={addForm.examiner_id} onChange={(v) => setAddForm({ ...addForm, examiner_id: v })} placeholder="— Select Examiner —" options={
                    allExaminers.map(e => ({ value: String(e.examiner_id), label: e.name, sub: e.role }))
                  } />
                ) : (
                  <>
                    <input placeholder="Examiner Name" value={addForm.new_examiner_name} onChange={(e) => setAddForm({ ...addForm, new_examiner_name: e.target.value })} className="form-input w-full" />
                    <Select value={addForm.new_examiner_role} onChange={(v) => setAddForm({ ...addForm, new_examiner_role: v })} options={[
                      { value: "Principal_Investigator", label: "Principal Investigator" },
                      { value: "Sub_Investigator", label: "Sub Investigator" },
                    ]} />
                  </>
                )}
                {addError && <p className="form-error">{addError}</p>}
                <button disabled={!addForm.site_name || creating}
                  onClick={handleCreate} className="form-submit">
                  {creating ? "Creating…" : "Create Site"}
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

export default SitesPage;
