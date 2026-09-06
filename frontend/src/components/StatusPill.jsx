export function StatusPill({ status }) {
  return (
    <span className={`status-pill status-pill--${status}`}>
      <span aria-hidden="true" />
      {status}
    </span>
  );
}
