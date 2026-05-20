import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(() => {
    const saved = sessionStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const setUser = (u, token) => {
    if (u) {
      sessionStorage.setItem("user", JSON.stringify(u));
      if (token) sessionStorage.setItem("token", token);
    } else {
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("token");
    }
    setUserState(u);
  };

  const isAdmin = user?.role === "Admin";

  return (
    <AuthContext.Provider value={{ user, setUser, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
