import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./components/App";

const container = document.getElementById("container");
if (!container) {
  throw new Error("Container not found");
}
const root = createRoot(container);

function render() {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

render();
