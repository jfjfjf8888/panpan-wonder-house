"use client";

import { useEffect } from "react";

export default function NotFound() {
  useEffect(() => {
    window.location.replace("/");
  }, []);

  return (
    <>
      <meta httpEquiv="refresh" content="0;url=/" />
      <div className="site-shell safe-pad flex min-h-[50vh] items-center justify-center text-sm text-[var(--muted)]">
        正在回到妙妙屋…
      </div>
    </>
  );
}
