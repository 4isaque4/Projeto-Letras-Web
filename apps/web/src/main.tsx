
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import { AuthProvider } from "./app/core/auth/AuthProvider";
import { initSentry, Sentry } from "./app/core/observability/sentry";

initSentry();

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary fallback={<div role="alert">Algo deu errado. Recarregue a página.</div>}>
    <AuthProvider>
      <App />
    </AuthProvider>
  </Sentry.ErrorBoundary>,
);

