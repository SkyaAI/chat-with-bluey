"use client";

import { useEffect } from "react";

export default function PwaSetup() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch((error) => console.error("[pwa]", error));
  }, []);
  return null;
}
