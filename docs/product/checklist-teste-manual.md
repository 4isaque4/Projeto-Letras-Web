# Checklist de teste manual — Painel, Alfabetizador, Alfabetizando

Baseado nas RN001–RN123 completas ([regras-negocio-completo.md](regras-negocio-completo.md)) **e na navegação real do painel**, mapeada ao vivo em 2026-08-19 (login como admin). Marque o que funcionar; me diga só o que **não** bateu com o esperado.

🚫 = não esperado funcionar (fora do escopo atual). ✅ = já confirmado funcionando nesta sessão. 🐞 = bug já confirmado, não precisa reportar de novo.

---

## A. Painel web (painel.letras.cloud) — menu lateral real

| Item do menu | Rota | O que testar |
|---|---|---|
| **Dashboard Geral** | `/admin/dashboard` | Números batem com a realidade: ativos, vínculos pendentes, fila de ajuda, aulas concluídas hoje |
| **Alfabetizandos** | `/admin/alfabetizandos` | ✅ lista carrega (23 alunos); filtro por "Alfabetizador responsável"; Ver detalhes / Editar / Alterar vínculo / Excluir funcionam |
| **Alfabetizadores** | `/admin/alfabetizadores` | ✅ lista carrega (6 tutores); Editar / Excluir funcionam; 🐞 coluna "Pontuação" do tutor Isaque mostra `3.45` — RN085 só prevê pontos inteiros, confirma se é bug de cálculo ou é outra métrica |
| **Vínculos e Convites** | `/admin/vinculos` | ✅ abas Pendentes(0)/Confirmados(20)/Negados(1) carregam; testar aprovar/negar um vínculo pendente de verdade (RN098-100) |
| **Trilha de aulas** | `/admin/trilha-de-aulas` | ✅ estrutura Tema → Etapa → Módulo → Aula confirmada; "Incluir na trilha" / "Remover da trilha" funcionam; reordenar aulas ("Reorganizar aulas") |
| **Fila de Atendimento** | `/admin/fila` | ✅ carrega; 🐞 tem 1 "Pedido de ajuda" com aluno "Sem nome" aberto há **43 dias** — investiga esse registro específico, parece travado |
| **Aulas e Mídias** | `/admin/conteudo` | Criar nova aula (preview ao vivo); Biblioteca de mídias; Vídeos de orientação; Importar telas; Publicar/Despublicar uma aula e ver refletir no mobile |
| **Pontuação & Ranking** | `/admin/ranking` | Aba "Ranking de Alunos" e "Ranking de Tutores"; 🐞 **Extrato de Pontos mostra `+0` em TODO lançamento**, mesmo pra alunos com pontos > 0 no ranking (ex.: Bruno Souza Teste tem 100 no ranking, mas extrato dele é todo +0) — bug confirmado, não precisa testar de novo, só confirma se via mobile o ponto realmente é creditado |
| **Relatórios** | `/admin/relatorios` | ✅ carrega; filtro de inatividade (3/5/7/10/15 dias); Exportar CSV funciona; 💡 alguns alunos mostram "999 dias" sem "Último acesso" (provável marcador de "nunca acessou" — funciona, mas confuso visualmente pra um admin) |
| **Configurações** | (Perfil/Sistema/Papeis) | Salvar perfil; "Enviar link de redefinição" de senha funciona; aba "Papeis" — o que ela controla? |

---

## B. Mobile — Alfabetizador

### Cadastro e login
- [ ] Primeiro acesso cai automático em Cadastro de Perfil (RN002)
- [ ] CPF/Passaporte + celular obrigatórios, mensagem de erro se faltar (RN003)
- [ ] Nome, nascimento, cidade, UF, foto obrigatórios na 2ª tela (RN005)
- [ ] Box UF em ordem alfabética, siglas de 2 letras (RN006)
- [ ] 3ª tela (escolaridade/formação/redes sociais) é opcional (RN006-Perfil3)

### Tutoriais
- [ ] Primeiro vídeo já disponível na Home antes de ir pra aba Tutoriais (RN011)
- [ ] Alfabetização não libera até assistir todos os vídeos obrigatórios (RN012)
- [ ] Texto muda pra "Assistido em DD/MM/AAAA" (RN013)
- [ ] Vídeo sempre pode ser reassistido (RN014)

### Home
- [ ] Clicar no nome do alfabetizando leva pra última página concluída — **testar com Bruno (Etapa 2) e com Maria (Etapa 3, segundo o painel) pra ver se o comportamento muda como a RN020 prevê** ("não se aplica à Etapa 3")
- [ ] Lupa busca por nome (RN023)

### Cadastrar/vincular alfabetizando
- [ ] "NOVO ALFABETIZANDO" abre formulário; CPF/celular obrigatórios (RN025)
- [ ] ❓ Existe alguma opção de **buscar** um alfabetizando já cadastrado por CPF/telefone só pra vincular (sem recadastrar)? (RN101-105) — no painel isso parece ser feito por "Alterar vínculo" na lista de Alfabetizandos; no mobile não achamos essa tela

### Perfil
- [ ] CPF/Passaporte não editável, resto sim (RN007)

### Pontuação (mobile)
- [ ] 🐞 Já sabemos que o extrato no painel mostra +0 — **confirma se no mobile a pontuação do educador aumenta de verdade** ao concluir algo com um aluno
- [ ] Frase "PESSOA QUE TRANSFORMA PESSOA!" forma 1 letra a cada 200 pontos (RN096)

### Espelhamento (acompanhar) e ajuda
- [ ] Testar com **Bruno ou Maria** (não bloqueados) — "Acompanhar" mostra a tela em tempo real (RN055)
- [ ] Testar por que **Carlos, Edir e João Augusto** aparecem como "Espelhamento bloqueado" — é esperado (vínculo pendente?) ou é bug?
- [ ] Fila de Atendimento no painel deveria refletir o mesmo pedido de ajuda que aparece no mobile — comparar

### Conduzir Etapa 1
- [ ] Cabeçalho mostra "Tela N de NN da Etapa 1" (RN040)
- [ ] Box cinza = orientação ao alfabetizador; fundo branco = conteúdo (RN041)
- [ ] Conclusão mostra pontuação + nível + certificado clicável (RN047-049)

---

## C. Mobile — Alfabetizando

### Etapa 2 (Bruno e Maria já estão aqui — Maria já em Etapa 3 segundo o painel)
- [ ] Seta AVANÇAR começa verde-claro, vira verde padrão só depois de cumprir a atividade (RN106)
- [ ] "Preciso de Ajuda" trava a tela até o alfabetizador desbloquear (RN109) — **e confirma se aparece na Fila de Atendimento do painel em tempo real**
- [ ] Erro mostra X vermelho + bip, acerto mostra V verde + bip (RN111-112)
- [ ] "Marcar Caixas": clicar muda pra amarelo, AVANÇAR só libera com a quantidade exata (RN123)
- [ ] 3 erros seguidos bloqueia e aparece na Fila de Atendimento do painel (RN119)

### Etapa 3 (Maria Teste já está aqui segundo o Ranking)
- [ ] ✅ **Correção da auditoria anterior**: a trilha de aulas já tem conteúdo real publicado pra Etapa 3 ("Encontre o B nas palavras", "O que começa com a letra A?") — testar se Maria consegue executar essas aulas normalmente
- [ ] 🚫 Telas dedicadas "Etapa 3 - Orientações/Abertura/Acompanhamento" (RN064-075) — ainda não devem ter UI própria, mas o exercício em si deve funcionar igual à Etapa 2

---

## Achados já confirmados — não precisa reportar de novo

- "PRECISO DE AJUDA" vermelho em vez de amarelo (visual)
- Quadrado de letra sem o estado amarelo intermediário (visual)
- "+ NOVO ALFABETIZANDO" branco em vez de amarelo — intencional, não é bug
- **Extrato de Pontos sempre +0** no painel (`/admin/ranking`), mesmo com saldo real no ranking
- Pontuação do tutor com casas decimais (`3.45`) em vez de inteiro
- 1 pedido de ajuda "Sem nome" travado há 43 dias na Fila de Atendimento
