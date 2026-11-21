/** The all-clear (board 23): a green disc pops in and its tick draws itself; the line says what was checked. */
export function AllClear() {
  return (
    <div className="dc-ok">
      <span className="dc-ck" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="#0b1022" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path className="dc-tick" d="M5 12l5 5 9-10" /></svg>
      </span>
      <b>Nothing looks off</b>
      <span>Empty days, double entries, odd weights and steps, open sessions and doses ticked twice all come up clear.</span>
    </div>
  );
}
