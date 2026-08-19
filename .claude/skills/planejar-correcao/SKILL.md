---
name: planejar-correcao
description: Converte um diagnóstico confirmado em plano detalhado e executável manualmente. Use após análise, antes da implementação.
disable-model-invocation: true
---

# Planejar correção

Use um único agente. Não implemente.

Para cada etapa, forneça:

- objetivo;
- pré-condições e dependências;
- arquivo, símbolo ou sistema exato;
- mudança detalhada;
- comando ou ação manual;
- resultado esperado e critério de aceite;
- teste de regressão;
- risco e rollback.

Ordene pela dependência, mantenha somente uma etapa elegível como próxima e destaque decisões que precisam do usuário.

