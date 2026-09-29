/*
 * LayoutAuth.tsx — moldura das telas de entrada (login, cadastro, senha).
 */
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Marca } from "@/app/Marca";

/* Cartão centralizado com a marca e o texto de apoio. */
export function LayoutAuth({ titulo, subtitulo, children, rodape }: { titulo: string; subtitulo?: string; children: ReactNode; rodape?: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-secondary to-background">
      <header className="container flex h-16 items-center">
        <Link to="/" aria-label="FacilAdmin, início">
          <Marca />
        </Link>
      </header>
      <main id="conteudo" className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:pt-12">
        <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold text-foreground">{titulo}</h1>
          {subtitulo && <p className="mt-1 text-sm text-muted-foreground">{subtitulo}</p>}
          <div className="mt-6">{children}</div>
          {rodape && <div className="mt-6 border-t pt-4 text-center text-sm text-muted-foreground">{rodape}</div>}
        </div>
      </main>
    </div>
  );
}

/* Fim de LayoutAuth.tsx */
