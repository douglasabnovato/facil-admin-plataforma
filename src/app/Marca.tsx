/*
 * Marca.tsx — logotipo textual da FacilAdmin.
 */

/* Símbolo + nome. */
export function Marca({ compacta = false }: { compacta?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="#002F87" />
        <path d="M18 46V18h26v7H26v5h15v7H26v9z" fill="#fff" />
        <circle cx="46" cy="44" r="5" fill="#34d399" />
      </svg>
      {!compacta && (
        <span className="text-lg font-semibold tracking-tight text-primary">
          Facil<span className="text-accent">Admin</span>
        </span>
      )}
    </span>
  );
}

/* Fim de Marca.tsx */
