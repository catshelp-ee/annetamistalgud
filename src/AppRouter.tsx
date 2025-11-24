import { useState, useEffect } from "react";
import App from "./App";
import Admin from "./pages/Admin";

export default function AppRouter() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Simple routing based on pathname
  if (currentPath === "/admin" || currentPath === "/admin/") {
    return <Admin />;
  }

  return <App />;
}