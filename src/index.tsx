import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./components/App";

const container = document.getElementById("container");
if (!container) {
  throw new Error("Container not found");
}
const root = createRoot(container);

function render() {
  root.render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>
  );
}

render();
