# Roadmap

## Feito — MVP (set/2026)
- F0 fundação: Vite + React + TS strict, shadcn, TanStack Query, CI, deploy no GitHub Pages.
- F1 organizações: condomínio, administradora, convite por código, membros e papéis, regras de compra.
- F2 fornecedores: perfil, raio, categorias, documentos no Storage, verificação pelo admin.
- F3 necessidades: listas por item, sugestão do condômino, lista da unidade, publicação com match e notificação.
- F4 propostas: vitrine anonimizada com score e motivos, proposta por item, comparativo com mínimo (RN05).
- F5 decisão: escolha, conselho por maioria simples (RN06), contatos (RN04), execução, conclusão e avaliação mútua (RN08).
- Admin: fila de documentos, fornecedores, categorias.

## Próximos passos sugeridos (validar prioridade)
| # | Item | Por quê |
|---|---|---|
| 1 | Fotos na lista (bucket e coluna já existem) | Fornecedor orça melhor com foto; reduz visitas técnicas |
| 2 | E-mail de notificações (Resend + domínio) | Sem e-mail, o fornecedor depende de abrir o app |
| 3 | Testes E2E com Playwright no CI (fluxo da demonstração) | Proteger o fluxo principal contra regressões |
| 4 | Tipos gerados (`supabase gen types`) | Menos manutenção manual de `tipos.ts` |
| 5 | Exportar comparativo e ata da votação em PDF | Prestação de contas em assembleia |
| 6 | Recorrência: renovar contratos mensais automaticamente | Limpeza, jardinagem e portaria são recorrentes |
| 7 | Métricas do funil (tabela `eventos`) | Medir publicação → proposta → contratação |
| 8 | Pagamento intermediado | Só depois de validar volume; exige análise fiscal e jurídica |
