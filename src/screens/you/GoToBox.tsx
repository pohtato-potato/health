import { useState } from 'react';
import { matchGoTo } from '../../domain/goTo';
import { go } from '../../router';

export function GoToBox({ months }: { months: string[] }) {
  const [q, setQ] = useState('');
  const hits = matchGoTo(q, months);
  return (
    <div>
      <input
        className="yu-goto yu-goto-in"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Go to a page, month or setting"
        aria-label="Go to a page, month or setting"
      />
      {hits.length > 0 && (
        <div className="yu-goto-hits">
          {hits.map((h) => <button key={`${h.label}${h.path}`} type="button" onClick={() => go(h.path.split('?')[0], Object.fromEntries(new URLSearchParams(h.path.split('?')[1] ?? '')))}>{h.label}</button>)}
        </div>
      )}
      {q.trim() && !hits.length && <p className="yu-q">Nothing by that name.</p>}
    </div>
  );
}
