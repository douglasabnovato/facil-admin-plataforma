/*
 * CamposEndereco.tsx — campos de endereço com busca por CEP e coordenadas automáticas.
 * As coordenadas são buscadas no Nominatim quando o CEP não as traz; sem elas o match usa a cidade.
 */
import { useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buscarCep, geocodificar, normalizarCep, type ValorEndereco } from "@/lib/endereco";

/* Grupo de campos; `completo` mostra logradouro e número (condomínio) ou só bairro/cidade (fornecedor). */
export function CamposEndereco({ valor, onChange, completo = true, prefixo = "end" }: { valor: ValorEndereco; onChange: (v: ValorEndereco) => void; completo?: boolean; prefixo?: string }) {
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const alterar = (campo: keyof ValorEndereco, v: string) => {
    const novo = { ...valor, [campo]: v };
    if (["logradouro", "numero", "bairro", "cidade", "uf"].includes(campo)) {
      novo.latitude = null;
      novo.longitude = null;
    }
    onChange(novo);
  };

  const aoSairDoCep = async () => {
    if (!normalizarCep(valor.cep)) return;
    setBuscando(true);
    setAviso(null);
    const e = await buscarCep(valor.cep);
    if (!e) {
      setAviso("CEP não encontrado. Preencha o endereço à mão.");
      setBuscando(false);
      return;
    }
    let novo: ValorEndereco = { ...valor, cep: e.cep.replace(/(\d{5})(\d{3})/, "$1-$2"), logradouro: e.logradouro || valor.logradouro, bairro: e.bairro || valor.bairro, cidade: e.cidade, uf: e.uf, latitude: e.latitude, longitude: e.longitude };
    if (novo.latitude === null) {
      const c = await geocodificar({ logradouro: completo ? novo.logradouro : null, bairro: novo.bairro, cidade: novo.cidade, uf: novo.uf });
      if (c) novo = { ...novo, ...c };
    }
    onChange(novo);
    setBuscando(false);
  };

  const localizar = async () => {
    setBuscando(true);
    const c = await geocodificar({ logradouro: completo ? valor.logradouro : null, numero: valor.numero, bairro: valor.bairro, cidade: valor.cidade, uf: valor.uf });
    if (c) onChange({ ...valor, ...c });
    else setAviso("Não achamos as coordenadas. O match vai usar a cidade.");
    setBuscando(false);
  };

  const id = (c: string) => `${prefixo}-${c}`;
  return (
    <div className="grid gap-4 sm:grid-cols-6">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={id("cep")}>CEP</Label>
        <div className="relative">
          <Input id={id("cep")} inputMode="numeric" autoComplete="postal-code" value={valor.cep} onChange={(e) => alterar("cep", e.target.value)} onBlur={aoSairDoCep} placeholder="00000-000" />
          {buscando && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" aria-label="Buscando" />}
        </div>
      </div>
      {completo && (
        <>
          <div className="space-y-2 sm:col-span-3">
            <Label htmlFor={id("logradouro")}>Rua</Label>
            <Input id={id("logradouro")} value={valor.logradouro} onChange={(e) => alterar("logradouro", e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-1">
            <Label htmlFor={id("numero")}>Número</Label>
            <Input id={id("numero")} value={valor.numero} onChange={(e) => alterar("numero", e.target.value)} />
          </div>
        </>
      )}
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={id("bairro")}>Bairro</Label>
        <Input id={id("bairro")} value={valor.bairro} onChange={(e) => alterar("bairro", e.target.value)} />
      </div>
      <div className="space-y-2 sm:col-span-3">
        <Label htmlFor={id("cidade")}>Cidade</Label>
        <Input id={id("cidade")} value={valor.cidade} onChange={(e) => alterar("cidade", e.target.value)} />
      </div>
      <div className="space-y-2 sm:col-span-1">
        <Label htmlFor={id("uf")}>UF</Label>
        <Input id={id("uf")} maxLength={2} value={valor.uf} onChange={(e) => alterar("uf", e.target.value.toUpperCase())} />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:col-span-6">
        <MapPin className="h-4 w-4" aria-hidden="true" />
        {valor.latitude !== null ? (
          <span>Localização encontrada ({valor.latitude.toFixed(4)}, {valor.longitude?.toFixed(4)}).</span>
        ) : (
          <>
            <span>Sem coordenadas ainda.</span>
            {valor.cidade && (
              <button type="button" className="text-primary underline" onClick={localizar} disabled={buscando}>
                Localizar no mapa
              </button>
            )}
          </>
        )}
        {aviso && <span className="text-warning">{aviso}</span>}
      </div>
    </div>
  );
}

/* Fim de CamposEndereco.tsx */
