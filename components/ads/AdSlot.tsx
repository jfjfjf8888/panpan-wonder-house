"use client";

import { useEffect, useState } from "react";

type Props = {
  slot: string;
};

export function AdSlot({ slot }: Props) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/site-config")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const on =
          Boolean(data?.ads?.globalEnabled) && Boolean(data?.ads?.siteAdsEnabled);
        setEnabled(on);
      })
      .catch(() => {
        if (!cancelled) setEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slot]);

  if (!enabled) return null;

  return (
    <div
      data-ad-slot={slot}
      className="soft-panel my-4 rounded-2xl px-4 py-3 text-center text-sm text-[var(--muted)]"
    >
      广告位预留：{slot}
    </div>
  );
}
