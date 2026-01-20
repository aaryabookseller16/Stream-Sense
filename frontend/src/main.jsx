import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// React application entry point
// This file is intentionally minimal: it mounts the App component
// and leaves all logic to higher-level components.

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
