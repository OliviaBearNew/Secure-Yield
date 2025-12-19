"use client";

import { FhevmProvider } from "../components/providers";
import { App } from "../components/App";

export default function Page() {
  return (
    <FhevmProvider>
      <App />
    </FhevmProvider>
  );
}

