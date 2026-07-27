---
name: project-next-steps
description: Próximos passos definidos para o projeto Letras mobile
metadata:
  type: project
---

Próxima etapa: implementar cadastro do alfabetizando no mobile.

**Why:** O fluxo atual provisiona o aprendiz automaticamente (bug crítico #1 da auditoria). Precisa ser substituído pelo fluxo real de CPF/telefone e vínculo com educador conforme Figma.

**How to apply:** Ao retomar o trabalho, focar em:
1. Rodar `pnpm db:migrate` no Supabase para criar as tabelas
2. Implementar tela de cadastro/vínculo do alfabetizando no mobile
3. Substituir `provisionLearnerProfile` em `learner-session-repository.impl.ts` pelo fluxo real
