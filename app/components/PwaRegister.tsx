"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        const ready = await navigator.serviceWorker.ready;
        ready.active?.postMessage({ type: "WARM_TODAY" });
      } catch (error) {
        console.warn("호행처럼 앱 등록 실패:", error);
      }
    };

    void register();
  }, []);

  return null;
}
