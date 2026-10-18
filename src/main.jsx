import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import BrowserLayoutSupport from "./components/common/BrowserLayoutSupport";
import { AuthProvider } from "./context/AuthContext";
import "./i18n";
import "@fontsource/tajawal/400.css";
import "@fontsource/tajawal/500.css";
import "@fontsource/tajawal/700.css";
import "@fontsource/tajawal/800.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <BrowserLayoutSupport />
        <App />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
