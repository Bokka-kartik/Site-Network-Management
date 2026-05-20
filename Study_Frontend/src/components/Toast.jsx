import { useState, useEffect } from "react";

let toastSetter = null;

export const showToast = (message, type = "success") => {
  if (toastSetter) toastSetter({ message, type, key: Date.now() });
};

const Toast = () => {
  const [toast, setToast] = useState(null);
  toastSetter = setToast;

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  if (!toast) return null;

  return (
    <div key={toast.key} className={`toast toast-${toast.type}`}>
      <span>{toast.type === "success" ? "✓" : "!"}</span>
      <p>{toast.message}</p>
    </div>
  );
};

export default Toast;
