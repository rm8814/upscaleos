"use client";

import React, { createContext, useCallback, useContext, useState } from "react";

type Toast = { id: number; text: string; tone: "default" | "success" | "error" };
type ToastCtx = (text: string, tone?: Toast["tone"]) => void;

const Ctx = createContext<ToastCtx>(() => {});

export function useToast() {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback<ToastCtx>((text, tone = "default") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto rounded-md border px-3.5 py-2 text-[12.5px] shadow-3"
            style={{
              background: "var(--bg-elevated)",
              borderColor:
                t.tone === "success"
                  ? "var(--accent-cyan)"
                  : t.tone === "error"
                    ? "var(--room-ooo)"
                    : "var(--line)",
              color: "var(--fg-ice)",
            }}
          >
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
