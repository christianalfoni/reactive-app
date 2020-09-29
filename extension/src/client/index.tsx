import * as React from "react";
import { render } from "react-dom";
import { BackendProvider } from "./backend";
import { App } from "./components/App";

render(
  <BackendProvider>
    <App />
  </BackendProvider>,
  document.querySelector("#app")
);
