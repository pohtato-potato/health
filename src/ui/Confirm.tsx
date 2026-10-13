import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ConfirmOptions {
  title: string;
  body?: string;
  yes?: string;
  no?: string;
  danger?: boolean;
}

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };
let show: ((p: Pending) => void) | null = null;

/**
 * Asks a yes-or-no question in the app's own sheet, never the browser's
 * dialog (which some webviews dismiss without asking). Resolves false when
 * no host is mounted.
 */
export function askConfirm(o: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!show) return resolve(false);
    show({ ...o, resolve });
  });
}

/** Mount once near the root. */
export function ConfirmHost() {
  const [p, setP] = useState<Pending | null>(null);
  useEffect(() => {
    show = setP;
    return () => {
      show = null;
    };
  }, []);
  if (!p) return null;
  const done = (ok: boolean) => {
    p.resolve(ok);
    setP(null);
  };
  return createPortal(
    <>
      <div className="scrim" style={{ zIndex: 90 }} onClick={() => done(false)} />
      <div className="sheet confirm" style={{ zIndex: 91 }} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className="sheet-body col gap12">
          <div id="confirm-title" className="h2">{p.title}</div>
          {p.body && <p className="t15 q lh" style={{ margin: 0 }}>{p.body}</p>}
          <button type="button" className={`btn lg block${p.danger ? ' danger' : ''}`} onClick={() => done(true)} autoFocus>
            {p.yes ?? 'Yes'}
          </button>
          <button type="button" className="btn ghost lg block" onClick={() => done(false)}>
            {p.no ?? 'Cancel'}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
