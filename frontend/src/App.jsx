import { useEffect, useState } from "react";
import DashboardPage from "./DashboardPage";
import LandingPage from "./LandingPage";

function normalizePath(pathname) {
  return pathname === "/dashboard" ? "/dashboard" : "/";
}

function App() {
  const [path, setPath] = useState(() => normalizePath(window.location.pathname));

  useEffect(() => {
    const onPopState = () => setPath(normalizePath(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    document.title =
      path === "/dashboard"
        ? "Live dashboard · StreamSense"
        : "StreamSense · Realtime service intelligence";
  }, [path]);

  function navigate(nextPath) {
    if (nextPath === path) return;
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="route-stage" key={path}>
      {path === "/dashboard" ? (
        <DashboardPage onNavigate={navigate} />
      ) : (
        <LandingPage onNavigate={navigate} />
      )}
    </div>
  );
}

export default App;
