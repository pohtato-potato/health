import { useEffect } from 'react';
import { bump } from '../db/actions';
import { go } from '../router';

/** The page that doesn't exist. Finding it is a secret achievement. */
export function NotFound() {
  useEffect(() => {
    void bump('404');
  }, []);
  return (
    <div className="page" style={{ alignItems: 'center', textAlign: 'center', paddingTop: 120 }}>
      <div className="num" style={{ fontSize: 88 }}>
        404
      </div>
      <div className="sf" style={{ fontSize: 26 }}>
        This page walked off.
      </div>
      <div className="voice" style={{ maxWidth: 300 }}>
        It said something about laps of the flat and never came back. I have filed a missing-page report.
      </div>
      <button type="button" className="btn" onClick={() => go('/today', undefined, { replace: true })}>
        Back to Today
      </button>
    </div>
  );
}
