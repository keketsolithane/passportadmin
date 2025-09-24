import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";      // ✅ Import the App component
import "./App.css";           // ✅ Import your CSS
import * as serviceWorkerRegistration from "./serviceWorkerRegistration";

const root = ReactDOM.createRoot(document.getElementById("root"));

// Wrap the entire App in BrowserRouter
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

// Register the service worker (optional for PWA)
serviceWorkerRegistration.register();
