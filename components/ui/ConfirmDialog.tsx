"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ConfirmTone = "default" | "danger" | "accent";

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
};

type ConfirmState = ConfirmOptions & {
  open: boolean;
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

const TONE_CONFIRM_CLASS: Record<ConfirmTone, string> = {
  default: "btn btn-primary",
  accent: "btn btn-secondary",
  danger:
    "btn bg-[#dc2626] text-white shadow-[0_10px_24px_rgba(220,38,38,0.28)] hover:bg-[#b91c1c]",
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    title: "",
    message: "",
  });
  const resolverRef = useRef<((value: boolean) => void) | null>(null);
  const titleId = useId();
  const descId = useId();
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const close = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, open: false }));
    resolverRef.current?.(value);
    resolverRef.current = null;
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current?.(false);
      resolverRef.current = resolve;
      setState({
        open: true,
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel ?? "确认",
        cancelLabel: options.cancelLabel ?? "取消",
        tone: options.tone ?? "default",
      });
    });
  }, []);

  useEffect(() => {
    if (!state.open) return;
    const prev = document.activeElement as HTMLElement | null;
    confirmBtnRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [state.open, close]);

  const tone = state.tone ?? "default";

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state.open ? (
        <div className="confirm-overlay" role="presentation" onClick={() => close(false)}>
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            className="confirm-dialog soft-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <p id={titleId} className="brand-title text-2xl text-[var(--brand-deep)]">
              {state.title}
            </p>
            <p id={descId} className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
              {state.message}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="btn btn-secondary !px-4 !py-2 text-sm"
                onClick={() => close(false)}
              >
                {state.cancelLabel}
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                className={`${TONE_CONFIRM_CLASS[tone]} !px-4 !py-2 text-sm`}
                onClick={() => close(true)}
              >
                {state.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return ctx.confirm;
}
