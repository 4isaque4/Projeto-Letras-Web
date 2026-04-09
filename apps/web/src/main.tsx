
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import { AuthProvider } from "./app/core/auth/AuthProvider";
import { startRealtimeBridge } from "./app/core/realtime/realtimeBootstrap";

startRealtimeBridge();

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>,
);
  
