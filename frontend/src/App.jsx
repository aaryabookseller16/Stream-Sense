import { useEffect, useState } from "react";
import AboutPage from "./AboutPage";
import DashboardPage from "./DashboardPage";
import LandingPage from "./LandingPage";

function normalizePath(pathname) {
  return ["/dashboard", "/product", "/about"].includes(pathname) ? pathname : "/";
}

function App() {
  const [path, setPath] = useState(() => normalizePath(window.location.pathname));

  useEffect(() => {
    const onPopState = () => setPath(normalizePath(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    document.title = {
      "/dashboard": "Dashboard · StreamSense",
      "/product": "Product · StreamSense",
      "/about": "StreamSense · Realtime service intelligence",
      "/": "StreamSense · Realtime service intelligence",
    }[path];
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
      ) : path === "/product" ? (
        <LandingPage onNavigate={navigate} />
      ) : (
        <AboutPage onNavigate={navigate} />
      )}
    </div>
  );
}

export default App;
