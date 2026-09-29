/*
 * Layout.tsx — moldura das páginas logadas: cabeçalho com navegação por perfil, sino de notificações,
 * menu do usuário e menu lateral no celular.
 */
import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell, LogOut, Menu, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/features/auth/contexto";
import { Marca } from "./Marca";
import { itensMenu } from "./menu";

/* Contagem de notificações não lidas (atualiza a cada minuto). */
function useNaoLidas(userId: string | undefined) {
  return useQuery({
    queryKey: ["notificacoes", "nao-lidas", userId],
    enabled: !!userId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase.from("notificacoes").select("id", { count: "exact", head: true }).eq("lida", false);
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
  });
}

/* Layout com cabeçalho fixo e área de conteúdo. */
export default function Layout() {
  const { perfil, usuario, sair } = useAuth();
  const navegar = useNavigate();
  const [aberto, setAberto] = useState(false);
  const { data: naoLidas = 0 } = useNaoLidas(usuario?.id);
  const itens = itensMenu(perfil?.tipo, !!perfil?.is_admin);

  const classeLink = ({ isActive }: { isActive: boolean }) =>
    cn("rounded-md px-3 py-2 text-sm font-medium transition-colors", isActive ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground");

  const encerrar = async () => {
    await sair();
    navegar("/entrar", { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-card focus:px-3 focus:py-2">
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="container flex h-16 items-center gap-4">
          <Sheet open={aberto} onOpenChange={setAberto}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle className="text-left"><Marca /></SheetTitle>
              </SheetHeader>
              <nav aria-label="Menu" className="mt-6 flex flex-col gap-1">
                {itens.map((i) => (
                  <NavLink key={i.para} to={i.para} end={i.para === "/"} className={classeLink} onClick={() => setAberto(false)}>
                    {i.rotulo}
                  </NavLink>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <Link to="/" aria-label="FacilAdmin, painel"><Marca /></Link>
          <nav aria-label="Principal" className="hidden flex-1 items-center gap-1 md:flex">
            {itens.map((i) => (
              <NavLink key={i.para} to={i.para} end={i.para === "/"} className={classeLink}>
                {i.rotulo}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <Button asChild variant="ghost" size="icon" className="relative" aria-label={naoLidas ? `Notificações, ${naoLidas} não lidas` : "Notificações"}>
              <Link to="/notificacoes">
                <Bell className="h-5 w-5" />
                {naoLidas > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold text-destructive-foreground">
                    {naoLidas > 99 ? "99+" : naoLidas}
                  </span>
                )}
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Conta">
                  <UserRound className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <span className="block truncate font-medium">{perfil?.nome ?? "Minha conta"}</span>
                  <span className="block truncate text-xs text-muted-foreground">{usuario?.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navegar("/conta")}>Meus dados</DropdownMenuItem>
                <DropdownMenuItem onSelect={encerrar} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main id="conteudo" className="container flex-1 py-6 sm:py-8">
        <Outlet />
      </main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        FacilAdmin · piloto · <Link to="/termos" className="underline">Termos</Link> · <Link to="/privacidade" className="underline">Privacidade</Link>
      </footer>
    </div>
  );
}

/* Fim de Layout.tsx */
