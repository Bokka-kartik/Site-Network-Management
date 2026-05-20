import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { LOGIN } from "../Connection/Schema_Acess";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import useDynamicFavicon from "../hooks/useDynamicFavicon";

const LoginPage = () => {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const { setUser } = useAuth();
  const navigate = useNavigate();

  useDynamicFavicon();

  const [login, { loading }] = useMutation(LOGIN, {
    onCompleted: (res) => {
      if (res.login.success) { setUser(res.login.user, res.login.token); navigate("/home"); }
      else setMsg(res.login.message);
    },
    onError: (err) => setMsg(err.message),
  });

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <img
            src="https://cdn-icons-png.flaticon.com/512/2966/2966327.png"
            alt="Medical Research"
            className="login-img"
            style={{ objectFit: 'contain', background: '#eff6ff' }}
          />
          <h2 className="login-title">Study Portal</h2>
          <p className="login-subtitle">Sign in to your account</p>
        </div>
        <form className="login-form" onSubmit={(e) => { e.preventDefault(); if (usernameOrEmail && password && !loading) login({ variables: { usernameOrEmail, password } }); }}>
          <input className="login-input" placeholder="Username or Email"
            value={usernameOrEmail} onChange={(e) => setUsernameOrEmail(e.target.value)} />
          <input className="login-input" type="password" placeholder="Password"
            value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="login-btn" type="submit"
            disabled={!usernameOrEmail || !password || loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
        {msg && <p className="login-error">{msg}</p>}
      </div>
    </div>
  );
};

export default LoginPage;
