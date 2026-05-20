import { useState, useRef, useEffect, useMemo } from "react";
import { useLazyQuery } from "@apollo/client/react";
import { useNavigate, useLocation } from "react-router-dom";
import { GET_SEARCH_DATA } from "../Connection/Schema_Acess";
import Highlight from "./Highlight";

const GlobalSearch = () => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const [fetchSearch, { data }] = useLazyQuery(GET_SEARCH_DATA, { fetchPolicy: "cache-first" });

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setOpen(true);
    if (val.trim() && !data) fetchSearch();
  };

  const handleFocus = () => {
    setOpen(true);
    if (query.trim() && !data) fetchSearch();
  };

  const results = useMemo(() => {
    if (!query.trim()) return { studies: [], sites: [], examiners: [] };
    const q = query.toLowerCase();
    return {
      studies: (data?.studies?.items || []).filter(s =>
        s.study_name.toLowerCase().includes(q) || s.protocol_id.toLowerCase().includes(q)
      ).slice(0, 5),
      sites: (data?.sites?.items || []).filter(s =>
        s.site_name.toLowerCase().includes(q) || (s.city || "").toLowerCase().includes(q) || (s.country || "").toLowerCase().includes(q)
      ).slice(0, 5),
      examiners: (data?.examiners?.items || []).filter(e =>
        e.name.toLowerCase().includes(q)
      ).slice(0, 5),
    };
  }, [query, data]);

  const hasResults = results.studies.length + results.sites.length + results.examiners.length > 0;
  const showDropdown = open && query.trim();

  const go = (path, searchTerm) => {
    setQuery("");
    setOpen(false);
    const [base] = path.split("?");
    const fullPath = searchTerm ? `${path}&search=${encodeURIComponent(searchTerm)}` : path;
    if (location.pathname === base) {
      navigate("/home");
      setTimeout(() => navigate(fullPath), 10);
    } else {
      navigate(fullPath);
    }
  };

  return (
    <div className="global-search" ref={ref}>
      <div className="global-search-icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        className="global-search-input"
        placeholder="Search everything…"
        value={query}
        onChange={handleChange}
        onFocus={handleFocus}
      />
      {showDropdown && (
        <div className="global-search-dropdown">
          {!hasResults && <p className="global-search-empty">No results found</p>}

          {results.studies.length > 0 && (
            <div className="global-search-group">
              <p className="global-search-group-label">Studies</p>
              {results.studies.map(s => (
                <div key={s.protocol_id} className="global-search-item" onClick={() => go(`/studies?expand=${s.protocol_id}`, s.study_name)}>
                  <div className="global-search-item-row">
                    <span className="global-search-item-name"><Highlight text={s.study_name} query={query} /></span>
                    <span className={`badge badge-${s.status?.toLowerCase()}`}>{s.status}</span>
                  </div>
                  <p className="global-search-item-sub"><Highlight text={s.sponsor} query={query} /> · <Highlight text={s.protocol_id} query={query} /></p>
                </div>
              ))}
            </div>
          )}

          {results.sites.length > 0 && (
            <div className="global-search-group">
              <p className="global-search-group-label">Sites</p>
              {results.sites.map(s => (
                <div key={s.site_id} className="global-search-item" onClick={() => go(`/sites?expand=${s.site_id}`, s.site_name)}>
                  <div className="global-search-item-row">
                    <span className="global-search-item-name"><Highlight text={s.site_name} query={query} /></span>
                    <span className={`badge badge-${s.status?.toLowerCase()}`}>{s.status}</span>
                  </div>
                  <p className="global-search-item-sub"><Highlight text={[s.city, s.country].filter(Boolean).join(", ")} query={query} /></p>
                </div>
              ))}
            </div>
          )}

          {results.examiners.length > 0 && (
            <div className="global-search-group">
              <p className="global-search-group-label">Examiners</p>
              {results.examiners.map(e => (
                <div key={e.examiner_id} className="global-search-item" onClick={() => go(`/examiners?expand=${e.examiner_id}`, e.name)}>
                  <div className="global-search-item-row">
                    <span className="global-search-item-name"><Highlight text={e.name} query={query} /></span>
                    <span className={`badge ${e.site_status === "Assigned" ? "badge-active" : "badge-closed"}`}>{e.site_status}</span>
                  </div>
                  <p className="global-search-item-sub">{e.role}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
