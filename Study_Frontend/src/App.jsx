import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./components/LoginPage";
import Dashboard from "./components/Dashboard";
import HomePage from "./pages/HomePage";
import StudiesPage from "./pages/StudiesPage";
import SitesPage from "./pages/SitesPage";
import ExaminersPage from "./pages/ExaminersPage";

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute> 
              <Dashboard />      {/* it's NAV BAR upper most div for helping with different menu  */}
            </ProtectedRoute>
          }
        >
          <Route path="/home" element={<HomePage />} />
          <Route path="/studies" element={<StudiesPage />} />
          <Route path="/sites" element={<SitesPage />} />
          <Route path="/examiners" element={<ExaminersPage />} />

          {/* hello you to avoid unwanted routes that a user maybe want access */}

           <Route path="*" element={<Navigate to="/home" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

export default App;
