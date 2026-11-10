/*
 * main.tsx — ponto de entrada do front.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./index.css";
import { iniciarMedicao } from "./lib/medicao";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/* Medição de uso só no build de produção e fora de testes automatizados (D5). */
iniciarMedicao(document, { producao: import.meta.env.PROD, automatizado: navigator.webdriver });

/* Fim de main.tsx */
