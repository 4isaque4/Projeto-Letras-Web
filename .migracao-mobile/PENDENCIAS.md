# Pendências — Reunião 23/06/2026

Prazo POC: **30/06/2026**

---

## Mobile

### Etapa 2 — Fluxo de sessão (crítico)
- [ ] **Confirmação por sessão** — alfabetizando informa CPF no app → notificação no celular do alfabetizador → confirma ou rejeita (motivos: não conheço, desisti, outro). `EducatorLinkConfirmView` atual é só para vinculação inicial, não cobre esse fluxo por sessão.
- [ ] **Espelhamento em tempo real** — tela do alfabetizador exibe quadrado mostrando o que o alfabetizando está vendo. Instruções exclusivas do alfabetizador ficam fora do quadrado.
- [ ] **Navegação bidirecional sincronizada** — avançar/recuar impacta os dois lados ao mesmo tempo ("freio do instrutor de autoescola").
- [ ] **Máx 3 tentativas → pedido de ajuda obrigatório automático** — depois de 3 erros, tela do alfabetizando trava com "Aguardando ajuda". O `helpRequest` existe no viewmodel mas o gatilho automático por tentativas não está implementado.

### Tutoriais / Vídeos
- [ ] **14 vídeos estaticamente no código** — decisão da reunião: colocar os arquivos recebidos via Drive direto no bundle, não depender de `public_url` do Supabase (limite 50MB). Hoje ainda usa URL dinâmica do banco.
- [ ] **Regra dos 7 dias para vídeo novo** — quando um novo vídeo é adicionado, quem já está alfabetizando recebe notificação mas não é bloqueado imediatamente. Bloqueia apenas o início de *novas* alfabetizações após 7 dias sem assistir.

---

## Web (painel admin)

- [ ] **Interface de gestão de vídeos** — seção para subir/gerenciar vídeos de tutoriais, dicas e introduções de etapa. `apps/web/src` está praticamente vazio (só `App.tsx` e `main.tsx`). Estava ~60% segundo a reunião — verificar no Sandbox Web.

---

## Concluído desde 23/06

- [x] Etapa 1 mobile — nomenclatura, tutoriais, UX, pontuação, conclusão de etapa, orientações
- [x] Nomenclatura "alfabetizando/alfabetizador" em toda copy visível
- [x] Seção de pedidos de apoio e bloqueios na Home do alfabetizador
- [x] Sistema de pontuação (RN085, RN086, RN096)
- [x] Ícone de notificação (bell sem número, ponto vermelho)
- [x] Logo com fundo transparente nos thumbnails de tutorial
- [x] Botão "Novo Alfabetizando" branco com borda
