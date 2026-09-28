import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

export interface ToastInput {
  kicker?: string;
  text: string;
  sub?: string;
  tone?: 'plain' | 'gold' | 'sage' | 'lavender';
  /** A coloured dot, for achievements: filled, or dashed for a secret. */
  dot?: { color: string; dashed?: boolean };
  action?: { label: string; run: () => void };
  ms?: number;
  onTap?: () => void;
}

interface ToastItem extends ToastInput {
  id: number;
  born: number;
}

/** Called when Undo is tapped within five seconds, for an achievement. */
let onFastUndo: (() => void) | undefined;
export function setFastUndoHandler(fn: () => void) {
  onFastUndo = fn;
}

const Ctx = createContext<(t: ToastInput) => void>(() => {});

export function useToast() {
  return useContext(Ctx);
}

/** Small moments slide in at the top for four seconds. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);

  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);

  const show = useCallback(
    (t: ToastInput) => {
      const id = next.current++;
      setItems((xs) => [...xs.slice(-2), { ...t, id, born: Date.now() }]);
      window.setTimeout(() => dismiss(id), t.ms ?? (t.action ? 6000 : 4000));
    },
    [dismiss],
  );

  return (
    <Ctx.Provider value={show}>
      {children}
      <div className="toasts" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            className={`toast${t.tone && t.tone !== 'plain' ? ` ${t.tone}` : ''}`}
            onClick={() => {
              if (t.onTap) {
                t.onTap();
                dismiss(t.id);
              } else if (!t.action) dismiss(t.id);
            }}
          >
            {t.dot && (
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  flexShrink: 0,
                  background: t.dot.dashed ? 'transparent' : t.dot.color,
                  border: t.dot.dashed ? `1.5px dashed ${t.dot.color}` : 0,
                }}
              />
            )}
            <div className="col gap2" style={{ minWidth: 0 }}>
              {t.kicker && (
                <span className="k" style={{ color: t.dot?.color ?? (t.tone === 'gold' ? 'var(--gold)' : t.tone === 'sage' ? 'var(--sage)' : t.tone === 'lavender' ? 'var(--lavender)' : 'var(--quiet)') }}>
                  {t.kicker}
                </span>
              )}
              <span className="v">{t.text}</span>
              {t.sub && <span className="x">{t.sub}</span>}
            </div>
            {t.action && (
              <button
                type="button"
                className="act"
                onClick={(e) => {
                  e.stopPropagation();
                  if (t.action!.label === 'Undo' && Date.now() - t.born <= 5000) onFastUndo?.();
                  t.action!.run();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
