import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx"; // Ensure this file exists
import "./styles.css"; // Ensure global styles are imported

const rootElement = document.getElementById("root");

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("❌ Root element not found! Ensure <div id='root'></div> exists in index.html.");
}
