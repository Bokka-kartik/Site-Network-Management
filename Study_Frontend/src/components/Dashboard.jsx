import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useRef, useEffect, useMemo } from "react";
import GlobalSearch from "./GlobalSearch";
import ParallaxBg from "./ParallaxBg";
import Toast from "./Toast";
import AuditLog from "./AuditLog";
import useDynamicFavicon from "../hooks/useDynamicFavicon";

const Dashboard = () => {
  const { user, setUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = useRef(null);
  const [spread, setSpread] = useState(null);
  const [visible, setVisible] = useState(true);
  const [showGlobalLog, setShowGlobalLog] = useState(false);

  //its only hold useEffect which mostly hold the title imgs/icons for individual menu
  useDynamicFavicon();

  const handleLogout = () => { setUser(null); navigate("/"); };

  const handleTabClick = (e, path) => {
    e.preventDefault();
    if (location.pathname === path) return;

    const rect = mainRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setVisible(false);
    setTimeout(() => {
      navigate(path);
      setSpread({ x, y });
      setVisible(true);
    }, 150);
  };

  useEffect(() => {
    if (spread) {
      const timer = setTimeout(() => setSpread(null), 500);
      return () => clearTimeout(timer);
    }
  }, [spread]);

  const theme = useMemo(() => {
    if (location.pathname.startsWith("/studies")) return "studies";
    if (location.pathname.startsWith("/sites")) return "sites";
    if (location.pathname.startsWith("/examiners")) return "examiners";
    return "studies";
  }, [location.pathname]);

  return (
    <ParallaxBg theme={theme} opacity={0.65}>
      <div className="dashboard">
        <header className="dash-header">
          <div className="dash-header-inner">
            <div className="dash-logo-group">
              <div className="dash-logo">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="dash-brand" style={{ cursor: "pointer" }} onClick={(e) => handleTabClick(e, "/home")}>Study Dashboard</h1>
              <div className="dash-tabs">
                {["studies", "sites", "examiners"].map((t) => (
                  <NavLink key={t} to={`/${t}`}
                    onClick={(e) => handleTabClick(e, `/${t}`)}
                    className={({ isActive }) => `dash-tab ${isActive ? "active" : ""}`}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </NavLink>
                ))}
                {isAdmin && (
                  <button className="history-btn" style={{ marginLeft: 4 }} onClick={() => setShowGlobalLog(true)}>
                    📜 All Activity
                  </button>
                )}
              </div>
            </div>
            <div className="dash-user-area">
              <GlobalSearch />
              <div className="dash-user-info">
                <div className="dash-avatar">
                  <span>{user.username[0].toUpperCase()}</span>
                </div>
                <div>
                  <p className="dash-username">{user.username}</p>
                  <p className="dash-role">{user.role}</p>
                </div>
              </div>
              <button onClick={handleLogout} className="dash-logout">Logout</button>
            </div>
          </div>
        </header>

        <main className="dash-main" ref={mainRef}>
          <div className="spread-container" style={spread ? {
            "--spread-x": `${spread.x}px`,
            "--spread-y": `${spread.y}px`,
          } : undefined}>
            <div className={`spread-content ${visible ? "spread-visible" : "spread-hidden"} ${spread ? "spread-animate" : ""}`}>
              <Outlet />
            </div>
          </div>
        </main>
        <Toast />
        {showGlobalLog && <AuditLog title="All Activity" onClose={() => setShowGlobalLog(false)} />}
      </div>
    </ParallaxBg>
  );
};

export default Dashboard;
