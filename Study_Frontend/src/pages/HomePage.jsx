import { useQuery } from "@apollo/client/react";
import { GET_COUNTS } from "../Connection/Schema_Acess";
import { Navigate } from "react-router-dom";

const HomePage = () => {
  const { data } = useQuery(GET_COUNTS);
  const c = data?.counts;
  // const c=false;

  return (
    <div className="home-page">
      <div className="home-icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      {c ? (
        <div className="home-counts">
          <div className="home-count-card" >
            <span className="home-count-num">{c.studies}</span>
            <span className="home-count-label">Studies</span>
          </div>
          <div className="home-count-card">
            <span className="home-count-num">{c.sites}</span>
            <span className="home-count-label">Sites</span>
          </div>
          <div className="home-count-card">
            <span className="home-count-num">{c.examiners}</span>
            <span className="home-count-label">Examiners</span>
          </div>
        </div>
      ) : (
        <p className="home-text">Loading…</p>
      )}
      <p className="home-text">Select a section above to get started</p>
    </div>
  );
};

export default HomePage;
