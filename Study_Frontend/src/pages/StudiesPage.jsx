import { useState, useEffect, Fragment } from "react";
import { useQuery, useLazyQuery, useMutation } from "@apollo/client/react";
import { useSearchParams } from "react-router-dom";
import {
  GET_STUDIES,
  GET_STUDY_DETAIL,
  GET_UNASSIGNED_SITES_FOR_STUDY,
  CREATE_STUDY,
  ASSIGN_STUDY_TO_SITE,
  ASSIGN_EXAMINER,
  UPDATE_STUDY,
} from "../Connection/Schema_Acess";
import { useAuth } from "../context/AuthContext";
import ParallaxBg from "../components/ParallaxBg";
import Pagination from "../components/Pagination";
import XFrame from "../components/XFrame";
import DatePicker from "../components/DatePicker";
import Select from "../components/Select";
import { showToast } from "../components/Toast";
import AuditLog from "../components/AuditLog";
import Highlight from "../components/Highlight";
import LocalSearch from "../components/LocalSearch";

const PER_PAGE = 6;
const emptyStudy = {
  protocol_id: "",
  study_name: "",
  sponsor: "",
  phase: "",
  start_date: "",
  end_date: "",
};

const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const StudiesPage = () => {
  const { isAdmin } = useAuth();
  const [expanded, setExpanded] = useState(null);
  const [highlight, setHighlight] = useState(null);
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(emptyStudy);
  const [addError, setAddError] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [searchParams] = useSearchParams();
  const [xframe, setXframe] = useState(null);
  const [auditLog, setAuditLog] = useState(null);

  const [addSiteFor, setAddSiteFor] = useState(null);
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [selectedSiteExaminer, setSelectedSiteExaminer] = useState("");
  const [siteError, setSiteError] = useState("");
  const [assignSiteId, setAssignSiteId] = useState(null);
  const [selectedExaminer, setSelectedExaminer] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sortCol, sortDir]);

  const queryVars = {
    page,
    perPage: PER_PAGE,
    search: debouncedSearch || undefined,
    sortCol,
    sortDir,
  };
  const { loading, error, data, refetch } = useQuery(GET_STUDIES, {
    variables: queryVars,
    fetchPolicy: "cache-first",
  });
  const [fetchDetail, { data: detailData, loading: detailLoading }] =
    useLazyQuery(GET_STUDY_DETAIL, { fetchPolicy: "cache-first" });
  const [fetchUnassigned, { data: unassignedData }] = useLazyQuery(
    GET_UNASSIGNED_SITES_FOR_STUDY,
    { fetchPolicy: "cache-first" },
  );

  const refetchAll = [{ query: GET_STUDIES, variables: queryVars }];

  const [createStudy, { loading: creating }] = useMutation(CREATE_STUDY, {
    refetchQueries: refetchAll,
    onCompleted: () => {
      setShowAdd(false);
      setAddForm(emptyStudy);
      setAddError("");
      showToast("Study created successfully");
    },
    onError: (err) => setAddError(err.message),
  });

  const [assignStudyToSite] = useMutation(ASSIGN_STUDY_TO_SITE, {
    onCompleted: async () => {
      if (selectedSiteExaminer && selectedSiteId) {
        try {
          await assignExaminer({
            variables: {
              protocol_id: addSiteFor,
              site_id: selectedSiteId,
              examiner_id: selectedSiteExaminer,
            },
          });
        } catch (_) {}
      }
      setAddSiteFor(null);
      setSelectedSiteId("");
      setSelectedSiteExaminer("");
      setSiteError("");
      showToast("Site assigned successfully");
      refetch();
      if (expanded) fetchDetail({ variables: { protocol_id: expanded } });
    },
    onError: (err) => setSiteError(err.message),
  });

  const [assignExaminer] = useMutation(ASSIGN_EXAMINER, {
    onCompleted: () => {
      showToast("Examiner assigned successfully");
      refetch();
      if (expanded) fetchDetail({ variables: { protocol_id: expanded } });
    },
    onError: (err) => showToast(err.message, "error"),
  });
  const [updateStudy] = useMutation(UPDATE_STUDY, {
    onCompleted: () => {
      showToast("Status updated");
      refetch();
      if (expanded) fetchDetail({ variables: { protocol_id: expanded } });
    },
    onError: (err) => showToast(err.message, "error"),
  });
  const [statusEdit, setStatusEdit] = useState(null);
  const [statusPos, setStatusPos] = useState({ top: 0, left: 0 });
  const [editEndDate, setEditEndDate] = useState(null);
  const [newEndDate, setNewEndDate] = useState("");
  const [editEndPos, setEditEndPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!statusEdit && !editEndDate) return;
    const close = (e) => {
      const portal = document.getElementById("datepicker-portal");
      if (portal && portal.contains(e.target)) return;
      setStatusEdit(null);
      setEditEndDate(null);
    };
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [statusEdit, editEndDate]);

  const studies = data?.studies?.items || [];
  const totalPages = data?.studies?.totalPages || 1;
  const total = data?.studies?.total || 0;
  const detail = detailData?.studyDetail?.study;
  const allSites = unassignedData?.unassignedSitesForStudy || [];

  const handleExpand = (protocolId) => {
    if (statusEdit) {
      setStatusEdit(null);
      return;
    }
    if (expanded === protocolId) {
      setExpanded(null);
      return;
    }
    setExpanded(protocolId);
    setAddSiteFor(null);
    setAssignSiteId(null);
    setHighlight(null);
    fetchDetail({ variables: { protocol_id: protocolId } });
  };

  useEffect(() => {
    const expandId = searchParams.get("expand");
    const urlSearch = searchParams.get("search");
    if (expandId && data) {
      const idx = studies.findIndex((s) => s.protocol_id === expandId);
      if (idx !== -1) {
        setExpanded(expandId);
        setHighlight(expandId);
        fetchDetail({ variables: { protocol_id: expandId } });
        setTimeout(() => setHighlight(null), 2500);
      } else if (urlSearch && search !== urlSearch) {
        setSearch(urlSearch);
      }
    }
  }, [searchParams, data]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const handleCreate = () => {
    setAddError("");
    if (studies.some((s) => s.protocol_id === addForm.protocol_id)) {
      setAddError(`Protocol ID "${addForm.protocol_id}" already exists`);
      return;
    }
    if (
      addForm.start_date &&
      addForm.end_date &&
      addForm.start_date >= addForm.end_date
    ) {
      setAddError("Start date must be before end date");
      return;
    }
    createStudy({ variables: addForm });
  };

  if (loading && !data) return <p className="status-loading">Loading…</p>;
  if (error && !data)
    return <p className="status-error">Error: {error.message}</p>;

  const sortIcon = (col) =>
    sortCol === col ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  const columns = [
    { key: "study_name", label: "Study Name" },
    { key: "protocol_id", label: "Protocol" },
    { key: "sponsor", label: "Sponsor" },
    { key: "phase", label: "Phase" },
    { key: "start_date", label: "Start" },
    { key: "end_date", label: "End" },
    { key: "status", label: "Status" },
  ];

  return (
    <>
      <div className="search-bar">
        <LocalSearch
          type="studies"
          placeholder="Search studies…"
          onSelect={(item) => {
            setSearch(item.study_name);
            setExpanded(item.protocol_id);
            setHighlight(item.protocol_id);
            fetchDetail({ variables: { protocol_id: item.protocol_id } });
            setTimeout(() => setHighlight(null), 2500);
          }}
        />
      </div>

      {isAdmin && (
        <div
          className="add-section"
          style={{ display: "flex", gap: 8, alignItems: "center" }}
        >
          <button
            onClick={() => {
              setShowAdd(!showAdd);
              setAddError("");
            }}
            className={`add-toggle ${showAdd ? "add-toggle-close" : "add-toggle-open"}`}
          >
            {showAdd ? "✕ Cancel" : "+ Add Study"}
          </button>
          <button
            className="history-btn"
            onClick={() =>
              setAuditLog({ type: "study", title: "Study History" })
            }
          >
            📜 History
          </button>
        </div>
      )}

      <div className={`data-table-wrap${statusEdit ? " status-open" : ""}`}>
        <table className="data-table">
          {/* <thead>
            <tr>
              <th className="sortable-th" onClick={() => handleSort("study_name")}>Study Name{sortIcon("study_name")}</th>
              <th className="sortable-th" onClick={() => handleSort("protocol_id")}>Protocol{sortIcon("protocol_id")}</th>
              <th className="sortable-th" onClick={() => handleSort("sponsor")}>Sponsor{sortIcon("sponsor")}</th>
              <th className="sortable-th" onClick={() => handleSort("phase")}>Phase{sortIcon("phase")}</th>
              <th className="sortable-th" onClick={() => handleSort("start_date")}>Start{sortIcon("start_date")}</th>
              <th className="sortable-th" onClick={() => handleSort("end_date")}>End{sortIcon("end_date")}</th>
              <th className="sortable-th" onClick={() => handleSort("status")}>Status{sortIcon("status")}</th>
            </tr>
          </thead> */}

          <thead>
            <tr>
              {columns.map(({ key, label }) => (
                <th
                  key={key}
                  className="sortable-th"
                  onClick={() => handleSort(key)}
                >
                  {label}
                  {sortIcon(key)}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {studies.map((study) => {
              const isExpanded = expanded === study.protocol_id;
              const studySites =
                isExpanded && detail?.protocol_id === study.protocol_id
                  ? detail.sites
                  : [];
              return (
                <Fragment key={study.protocol_id}>
                  <tr
                    className={
                      highlight && highlight !== study.protocol_id
                        ? "row-dimmed"
                        : highlight === study.protocol_id
                          ? "row-highlight"
                          : ""
                    }
                    onClick={() => handleExpand(study.protocol_id)}
                  >
                    <td className="font-medium">
                      <Highlight text={study.study_name} query={search} />
                    </td>
                    <td>
                      <Highlight text={study.protocol_id} query={search} />
                    </td>
                    <td>
                      <Highlight text={study.sponsor} query={search} />
                    </td>
                    <td>
                      <Highlight text={study.phase} query={search} />
                    </td>
                    <td>{fmtDate(study.start_date)}</td>
      
                      {/* as admin can change the things around we are giving access to change the date when 
                      clicked on the certain end date  */}
                    <td>
                      <span
                        style={{ cursor: isAdmin ? "pointer" : "default" }}
                        onClick={(e) => {
                          if (!isAdmin) return;
                          e.stopPropagation();
                          if (editEndDate === study.protocol_id) {
                            setEditEndDate(null);
                            return;
                          }
                          const rect = e.currentTarget.getBoundingClientRect();
                          setEditEndPos({
                            top: rect.bottom + 4,
                            left: rect.left,
                          });
                          setEditEndDate(study.protocol_id);
                          setNewEndDate(study.end_date || "");
                        }}
                      >
                        {study.end_date ? fmtDate(study.end_date) : "—"}
                      </span>
                    </td>
                    <td>
                      {/*here if the user is admin he/she can change the the status    */}
                      {isAdmin ? (
                        (() => {
                          const isEnded =
                            study.end_date &&
                            new Date(study.end_date) <
                              new Date(new Date().toISOString().split("T")[0]);
                          return isEnded ? (
                            <span
                              className="badge badge-completed"
                              title="Study end date has passed"
                            >
                              Completed
                            </span>
                          ) : (
                            <span
                              className={`badge badge-${study.status?.toLowerCase()}`}
                              style={{ cursor: "pointer" }}
                              onClick={(e) => {
                                // helps to mitigate the flow to the parent 
                                e.stopPropagation();
                                if (statusEdit === study.protocol_id) {
                                  setStatusEdit(null);
                                  return;
                                }
                                const rect =
                                  e.currentTarget.getBoundingClientRect();
                                setStatusPos({
                                  top: rect.bottom + 4,
                                  left: rect.right - 120,
                                });
                                setStatusEdit(study.protocol_id);
                              }}
                            >
                              {study.status} ▾
                            </span>
                          );
                        })()
                      ) : (
                        <span
                          className={`badge badge-${study.status?.toLowerCase()}`}
                        >
                          {study.status}
                        </span>
                      )}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${study.protocol_id}-exp`} className="expand-row">
                      <td colSpan={7}>
                        {detailLoading &&
                        detail?.protocol_id !== study.protocol_id ? (
                          <p className="status-loading">Loading details…</p>
                        ) : (
                          <>
                            <p className="nested-label">
                              Sites ({studySites.length})
                            </p>
                            {studySites.map((site) => (
                              <div
                                className="nested-item nested-link"
                                key={site.site_id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setXframe({ type: "site", data: site });
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="nested-item-name">
                                    {site.site_name}
                                  </span>
                                  <span
                                    className={`badge badge-${site.status?.toLowerCase()}`}
                                  >
                                    {site.status}
                                  </span>
                                </div>
                                <p className="nested-item-sub">
                                  {[site.city, site.country]
                                    .filter(Boolean)
                                    .join(", ")}
                                </p>
                                {site.examiners.length > 0 && (
                                  <div className="tag-list">
                                    {site.examiners.map((ex) => (
                                      <span
                                        className="tag tag-link"
                                        key={ex.examiner_id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setXframe({
                                            type: "examiner",
                                            data: ex,
                                          });
                                        }}
                                      >
                                        {ex.name} — {ex.role}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {isAdmin && (
                                  <div style={{ marginTop: 4 }}>
                                    {assignSiteId === site.site_id ? (
                                      <div
                                        className="inline-assign"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Select
                                          className="cselect-sm"
                                          value={selectedExaminer}
                                          onChange={(v) =>
                                            setSelectedExaminer(v)
                                          }
                                          placeholder="— Select Examiner —"
                                          options={(() => {
                                            const sitePool =
                                              site.all_examiners || [];
                                            return sitePool
                                              .filter(
                                                (e) =>
                                                  !site.examiners.some(
                                                    (se) =>
                                                      se.examiner_id ==
                                                      e.examiner_id,
                                                  ) &&
                                                  (e.certificates || []).some(
                                                    (c) =>
                                                      c.protocol_id ===
                                                        study.protocol_id &&
                                                      new Date(c.expiry_date) >=
                                                        new Date(),
                                                  ),
                                              )
                                              .map((e) => ({
                                                value: String(e.examiner_id),
                                                label: e.name,
                                                sub: e.role,
                                              }));
                                          })()}
                                        />
                                        <button
                                          className="form-submit-sm"
                                          disabled={!selectedExaminer}
                                          onClick={() => {
                                            assignExaminer({
                                              variables: {
                                                protocol_id: study.protocol_id,
                                                site_id: String(site.site_id),
                                                examiner_id: selectedExaminer,
                                              },
                                            });
                                            setSelectedExaminer("");
                                            setAssignSiteId(null);
                                          }}
                                        >
                                          Assign
                                        </button>
                                        <button
                                          className="add-toggle add-toggle-close text-xs"
                                          onClick={() => setAssignSiteId(null)}
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        className="add-toggle add-toggle-open text-xs"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setAssignSiteId(site.site_id);
                                        }}
                                      >
                                        + Assign Examiner
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                            {studySites.length === 0 && (
                              <p className="no-data">No sites</p>
                            )}

                            {isAdmin &&
                              study.status !== "Completed" &&
                              addSiteFor !== study.protocol_id && (
                                <button
                                  className="add-toggle add-toggle-open text-xs mt-3"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAddSiteFor(study.protocol_id);
                                    setSelectedSiteId("");
                                    setSelectedSiteExaminer("");
                                    setSiteError("");
                                    fetchUnassigned({
                                      variables: {
                                        protocol_id: study.protocol_id,
                                      },
                                    });
                                  }}
                                >
                                  + Assign Site
                                </button>
                              )}
                            {isAdmin &&
                              study.status !== "Completed" &&
                              addSiteFor === study.protocol_id && (
                                <div
                                  className="edit-inline"
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ marginTop: 12 }}
                                >
                                  <p className="nested-label">
                                    Assign Site to {study.study_name}
                                  </p>
                                  <div className="add-form-grid">
                                    <Select
                                      value={selectedSiteId}
                                      onChange={(v) => {
                                        setSelectedSiteId(v);
                                        setSelectedSiteExaminer("");
                                      }}
                                      placeholder="— Select Site —"
                                      options={allSites.map((s) => ({
                                        value: String(s.site_id),
                                        label: s.site_name,
                                        sub: [s.city, s.country]
                                          .filter(Boolean)
                                          .join(", "),
                                      }))}
                                    />
                                  </div>
                                  {selectedSiteId &&
                                    (() => {
                                      const pickedSite = allSites.find(
                                        (s) =>
                                          String(s.site_id) === selectedSiteId,
                                      );
                                      const pool = pickedSite?.examiners || [];
                                      return pool.length > 0 ? (
                                        <div style={{ marginTop: 8 }}>
                                          <p className="xframe-field-label">
                                            Assign Examiner (optional)
                                          </p>
                                          <Select
                                            className="mt-1"
                                            value={selectedSiteExaminer}
                                            onChange={(v) =>
                                              setSelectedSiteExaminer(v)
                                            }
                                            placeholder="— None —"
                                            options={pool.map((e) => ({
                                              value: String(e.examiner_id),
                                              label: e.name,
                                              sub: e.role,
                                            }))}
                                          />
                                        </div>
                                      ) : null;
                                    })()}
                                  {siteError && (
                                    <p className="form-error">{siteError}</p>
                                  )}
                                  <div className="flex gap-2 mt-2">
                                    <button
                                      className="form-submit-sm"
                                      disabled={!selectedSiteId}
                                      onClick={() => {
                                        setSiteError("");
                                        assignStudyToSite({
                                          variables: {
                                            protocol_id: study.protocol_id,
                                            site_id: selectedSiteId,
                                          },
                                        });
                                      }}
                                    >
                                      Assign
                                    </button>
                                    <button
                                      className="add-toggle add-toggle-close text-xs"
                                      onClick={() => {
                                        setAddSiteFor(null);
                                        setSiteError("");
                                        setSelectedSiteExaminer("");
                                      }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                          </>
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

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        perPage={PER_PAGE}
        onPageChange={setPage}
      />

      {xframe && (
        <XFrame
          type={xframe.type}
          data={xframe.data}
          allStudies={[...(detail ? [detail] : []), ...studies]}
          allSites={detail?.sites || []}
          allExaminers={[]}
          onClose={() => setXframe(null)}
          onOpenXFrame={(type, d) => setXframe({ type, data: d })}
        />
      )}

      {auditLog && (
        <AuditLog
          entityType={auditLog.type}
          entityId={auditLog.id}
          title={auditLog.title}
          onClose={() => setAuditLog(null)}
        />
      )}

      {statusEdit && (
        <>
          <div
            className="status-backdrop"
            onClick={() => setStatusEdit(null)}
          />
          <div
            className="status-dropdown"
            style={{ top: statusPos.top, left: statusPos.left }}
          >
            {["Planned", "Active", "Completed"].map((s) => (
              <span
                key={s}
                className={`status-option badge badge-${s.toLowerCase()}`}
                onClick={() => {
                  updateStudy({
                    variables: { protocol_id: statusEdit, status: s },
                  });
                  setStatusEdit(null);
                }}
              >
                {s}  
              </span>
            ))}
          </div>
        </>
      )}

      {editEndDate && (
        <>
          <div
            className="status-backdrop"
            onClick={() => setEditEndDate(null)}
          />
          <div
            className="status-dropdown"
            style={{
              top: editEndPos.top,
              left: editEndPos.left,
              minWidth: 220,
            }}
          >
            <DatePicker
              value={newEndDate}
              // here this min function will help to make sure the end date is not less then start date   
              min={(() => {
                const s = studies.find((s) => s.protocol_id === editEndDate);
                return s?.start_date || undefined;
              })()}
              placeholder="Select end date"
              onChange={(v) => setNewEndDate(v)}
            />
            <div className="flex gap-2 mt-1">
              <button
                className="form-submit-sm"
                style={{ flex: 1 }}
                disabled={
                  newEndDate ===
                  (studies.find((s) => s.protocol_id === editEndDate)
                    ?.end_date || "")
                }
                onClick={() => {
                  updateStudy({
                    variables: {
                      protocol_id: editEndDate,
                      end_date: newEndDate || null,
                    },
                  });
                  setEditEndDate(null);
                }}
              >
                {newEndDate ? "Save" : "Set as —"}
              </button>
              <button
                className="add-toggle add-toggle-close text-xs"
                onClick={() => setEditEndDate(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      {showAdd && (
        <div className="xframe-overlay" onClick={() => setShowAdd(false)}>
          <div
            className="xframe-panel xframe-panel-glass"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="xframe-panel-bg">
              <ParallaxBg theme="xf_study" opacity={0.5}>
                <div className="xframe-panel-inner">
                  <div className="xframe-header">
                    <span className="xframe-type-badge">New Study</span>
                    <button
                      className="xframe-close"
                      onClick={() => setShowAdd(false)}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="xframe-body">
                    <h2 className="xframe-title">Create Study</h2>
                    <div className="xframe-form-stack">
                      <label className="xframe-field-label">
                        Protocol ID <span className="req">*</span>
                      </label>
                      <input
                        placeholder="Protocol ID"
                        value={addForm.protocol_id}
                        onChange={(e) =>
                          setAddForm({
                            ...addForm,
                            protocol_id: e.target.value,
                          })
                        }
                        className="form-input w-full"
                      />
                      <label className="xframe-field-label">
                        Study Name <span className="req">*</span>
                      </label>
                      <input
                        placeholder="Study Name"
                        value={addForm.study_name}
                        onChange={(e) =>
                          setAddForm({ ...addForm, study_name: e.target.value })
                        }
                        className="form-input w-full"
                      />
                      <label className="xframe-field-label">
                        Sponsor <span className="req">*</span>
                      </label>
                      <input
                        placeholder="Sponsor"
                        value={addForm.sponsor}
                        onChange={(e) =>
                          setAddForm({ ...addForm, sponsor: e.target.value })
                        }
                        className="form-input w-full"
                      />
                      <label className="xframe-field-label">Phase</label>
                      <Select
                        value={addForm.phase}
                        onChange={(v) => setAddForm({ ...addForm, phase: v })}
                        placeholder="— Select Phase —"
                        options={[
                          { value: "Phase I", label: "Phase I" },
                          { value: "Phase II", label: "Phase II" },
                          { value: "Phase III", label: "Phase III" },
                          { value: "Phase IV", label: "Phase IV" },
                        ]}
                      />
                      <label className="xframe-field-label">Start Date</label>
                      <DatePicker
                        value={addForm.start_date}
                        max={addForm.end_date || undefined}
                        placeholder="Select start date"
                        onChange={(v) =>
                          setAddForm({ ...addForm, start_date: v })
                        }
                      />
                      <label className="xframe-field-label">End Date</label>
                      <DatePicker
                        value={addForm.end_date}
                        min={addForm.start_date || undefined}
                        placeholder="Select end date"
                        onChange={(v) =>
                          setAddForm({ ...addForm, end_date: v })
                        }
                      />
                      {addError && <p className="form-error">{addError}</p>}
                      <button
                        disabled={
                          !addForm.protocol_id ||
                          !addForm.study_name ||
                          !addForm.sponsor ||
                          creating
                        }
                        onClick={handleCreate}
                        className="form-submit"
                      >
                        {creating ? "Creating…" : "Create Study"}
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

export default StudiesPage;
