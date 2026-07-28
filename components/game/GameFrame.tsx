"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  gameId: string;
  slug: string;
  version: string;
  entryUrl: string;
  gameOrigin: string;
  muted: boolean;
  orientation?: string;
  immersive?: boolean;
  onGameStart?: () => void;
  onGameEnd?: () => void;
  onFullscreenRequest?: () => void;
};

type BridgeMsg = {
  source?: string;
  version?: string;
  type?: string;
  payload?: Record<string, unknown>;
};

function deviceType() {
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

function ensureIds() {
  let visitorId = localStorage.getItem("panpan_visitor_id");
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem("panpan_visitor_id", visitorId);
  }
  let sessionId = sessionStorage.getItem("panpan_session_id");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem("panpan_session_id", sessionId);
  }
  return { visitorId, sessionId };
}

async function track(eventType: string, extra: Record<string, unknown> = {}) {
  try {
    const { visitorId, sessionId } = ensureIds();
    await fetch("/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType,
        gameId: extra.gameId,
        gameVersion: extra.gameVersion,
        visitorId,
        sessionId,
        path: window.location.pathname,
        deviceType: deviceType(),
        browser: navigator.userAgent.includes("Chrome") ? "Chrome" : "Other",
        os: navigator.platform,
        referrer: document.referrer || "",
        properties: extra.properties || {},
      }),
    });
  } catch {
    // ignore analytics errors
  }
}

export function GameFrame({
  gameId,
  slug,
  version,
  entryUrl,
  gameOrigin,
  muted,
  orientation = "any",
  immersive = false,
  onGameStart,
  onGameEnd,
  onFullscreenRequest,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const sessionRef = useRef(crypto.randomUUID());
  const onGameStartRef = useRef(onGameStart);
  const onGameEndRef = useRef(onGameEnd);
  const onFullscreenRequestRef = useRef(onFullscreenRequest);

  useEffect(() => {
    onGameStartRef.current = onGameStart;
    onGameEndRef.current = onGameEnd;
    onFullscreenRequestRef.current = onFullscreenRequest;
  }, [onGameStart, onGameEnd, onFullscreenRequest]);

  useEffect(() => {
    track("GAME_OPEN", { gameId: slug, gameVersion: version });
  }, [slug, version]);

  useEffect(() => {
    const onMessage = (event: MessageEvent<BridgeMsg>) => {
      if (event.origin !== gameOrigin && !entryUrl.startsWith(event.origin)) {
        try {
          if (new URL(entryUrl).origin !== event.origin) return;
        } catch {
          return;
        }
      }
      const data = event.data;
      if (!data || data.source !== "panpan-game" || data.version !== "1.0") return;

      if (data.type === "GAME_READY") {
        setStatus("ready");
        track("GAME_READY", { gameId: slug, gameVersion: version });
        iframeRef.current?.contentWindow?.postMessage(
          {
            source: "panpan-host",
            version: "1.0",
            type: "HOST_INIT",
            payload: {
              gameId,
              sessionId: sessionRef.current,
              locale: "zh-CN",
              muted,
              adsEnabled: false,
            },
          },
          event.origin,
        );
      }
      if (data.type === "GAME_START") {
        track("GAME_START", { gameId: slug, gameVersion: version });
        onGameStartRef.current?.();
      }
      if (data.type === "GAME_END") {
        track("GAME_END", {
          gameId: slug,
          gameVersion: version,
          properties: data.payload || {},
        });
        onGameEndRef.current?.();
      }
      if (data.type === "GAME_ERROR") {
        setError(String(data.payload?.message || "游戏发生错误"));
        track("GAME_ERROR", {
          gameId: slug,
          gameVersion: version,
          properties: data.payload || {},
        });
      }
      if (data.type === "AD_REQUEST") {
        track("AD_REQUEST", { gameId: slug, gameVersion: version, properties: data.payload });
        iframeRef.current?.contentWindow?.postMessage(
          {
            source: "panpan-host",
            version: "1.0",
            type: "AD_RESULT",
            payload: {
              status: "disabled",
              rewardGranted: false,
              requestId: data.payload?.requestId,
            },
          },
          event.origin,
        );
        track("AD_RESULT", {
          gameId: slug,
          gameVersion: version,
          properties: { status: "disabled" },
        });
      }
      if (data.type === "FULLSCREEN_REQUEST") {
        onFullscreenRequestRef.current?.();
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [entryUrl, gameId, gameOrigin, muted, slug, version]);

  useEffect(() => {
    const origin = (() => {
      try {
        return new URL(entryUrl).origin;
      } catch {
        return gameOrigin;
      }
    })();
    iframeRef.current?.contentWindow?.postMessage(
      {
        source: "panpan-host",
        version: "1.0",
        type: "AUDIO_CHANGE",
        payload: { muted },
      },
      origin,
    );
  }, [muted, entryUrl, gameOrigin]);

  return (
    <div className={immersive ? "h-full w-full" : "space-y-3"}>
      {!immersive && orientation !== "any" ? (
        <div className="rounded-2xl bg-[rgba(15,118,110,0.08)] px-4 py-2 text-sm text-[var(--accent)] md:hidden">
          这个游戏更适合{orientation === "landscape" ? "横屏" : "竖屏"}游玩。
        </div>
      ) : null}
      <div
        className={
          immersive
            ? "relative h-full w-full overflow-hidden bg-black"
            : "relative aspect-video overflow-hidden rounded-3xl border border-[var(--line)] bg-black/90"
        }
      >
        {status === "loading" ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center text-white">
            游戏加载中…
          </div>
        ) : null}
        {status === "error" || error ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/80 p-6 text-center text-white">
            <p>游戏加载失败</p>
            <p className="text-sm text-white/70">{error || "请稍后重试"}</p>
          </div>
        ) : null}
        <iframe
          ref={iframeRef}
          title={`game-${slug}`}
          src={entryUrl}
          className="h-full w-full border-0"
          sandbox="allow-scripts allow-same-origin allow-pointer-lock"
          allow="fullscreen"
          referrerPolicy="no-referrer"
          onError={() => {
            setStatus("error");
            setError("iframe 加载失败");
          }}
        />
      </div>
    </div>
  );
}
