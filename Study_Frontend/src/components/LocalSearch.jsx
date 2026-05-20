import { useState, useRef, useEffect, useMemo } from "react";
import { useLazyQuery } from "@apollo/client/react";
import { GET_STUDIES, GET_SITES, GET_EXAMINERS } from "../Connection/Schema_Acess";
import Highlight from "./Highlight";

const QUERIES = { studies: GET_STUDIES, sites: GET_SITES, examiners: GET_EXAMINERS };

const LocalSearch = ({ type, onSelect, placeholder }) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const [fetchAll, { data }] = useLazyQuery(QUERIES[type], {
    variables: { page: 1, perPage: null },
    fetchPolicy: "cache-first",
  });

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleFocus = () => {
    setOpen(true);
    if (!data) fetchAll();
  };

  const allItems = data?.[type]?.items || [];

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const filtered = allItems.filter(item => {
      if (type === "studies") return item.study_name.toLowerCase().includes(q) || item.protocol_id.toLowerCase().includes(q) || item.sponsor.toLowerCase().includes(q);
      if (type === "sites") return item.site_name.toLowerCase().includes(q) || (item.city || "").toLowerCase().includes(q) || (item.country || "").toLowerCase().includes(q);
      return item.name.toLowerCase().includes(q) || item.role.toLowerCase().includes(q);
    });
    return filtered.slice(0, 7);
  }, [query, allItems, type]);

  const showDropdown = open && query.trim();

  const handleSelect = (item) => {
    setQuery("");
    setOpen(false);
    onSelect(item);
  };

  return (
    <div className="local-search-wrap" ref={ref}>
      <input
        className="search-input"
        placeholder={placeholder}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); if (!data) fetchAll(); }}
        onFocus={handleFocus}
      />
      {showDropdown && (
        <div className="local-search-dropdown">
          {results.length === 0 && <p className="global-search-empty">No results</p>}
          {results.map(item => {
            const id = type === "studies" ? item.protocol_id : type === "sites" ? item.site_id : item.examiner_id;
            const name = type === "studies" ? item.study_name : type === "sites" ? item.site_name : item.name;
            const sub = type === "studies" ? `${item.sponsor} · ${item.protocol_id}` : type === "sites" ? [item.city, item.country].filter(Boolean).join(", ") : item.role;
            return (
              <div key={id} className="global-search-item" onClick={() => handleSelect(item)}>
                <div className="global-search-item-row">
                  <span className="global-search-item-name"><Highlight text={name} query={query} /></span>
                  <span className={`badge badge-${(item.status || item.study_status || "").toLowerCase()}`}>{item.status || item.study_status}</span>
                </div>
                <p className="global-search-item-sub"><Highlight text={sub} query={query} /></p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LocalSearch;
