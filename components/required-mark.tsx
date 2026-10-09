/** Asterisque rouge pour les champs obligatoires. */
export function RequiredMark() {
  return (
    <span className="field-required" aria-hidden>
      {" "}
      *
    </span>
  );
}
