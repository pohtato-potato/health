/** The living background: four soft lights drifting, tinted by the state; still draws nothing moving. */
export function Aurora({ still }: { still?: boolean }) {
  return (
    <div className="lv-field" aria-hidden="true">
      {!still && (
        <>
          <i className="blob b1" />
          <i className="blob b2" />
          <i className="blob b3" />
          <i className="blob b4" />
        </>
      )}
      <i className="lv-dim" />
    </div>
  );
}
