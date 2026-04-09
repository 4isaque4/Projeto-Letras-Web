# Alfabetizador Online - Wireframe Low-Fi

Sistema de gestão para plataforma de alfabetização online com painel administrativo web.

## 📋 Visão Geral

Wireframe completo (preto/cinza, sem estilo final) para sistema web responsivo (desktop first) com dois perfis de acesso:
- **Admin/Coordenação**: Acesso completo ao sistema
- **Alfabetizador (Tutor)**: Gestão dos próprios alunos

## 🎨 Características do Design

- Layout com **sidebar esquerda** + **topbar** (busca + usuário)
- Paleta **monocromática** (preto/cinza) para wireframe
- Componentes reutilizáveis: tabelas, cards KPI, filtros, modais, drawers
- Estados visuais: **loading**, **empty**, **error**
- Responsivo (desktop first)

## 🗂️ Estrutura de Navegação

### Admin/Coordenação
1. Dashboard Geral
2. Alfabetizandos
3. Alfabetizadores
4. Vínculos e Convites
5. Grupos
6. Fila de Atendimento
7. Conteúdo (CMS)
8. Pontuação & Ranking
9. Relatórios
10. Configurações

### Alfabetizador (Tutor)
1. Meu Dashboard
2. Meus Alfabetizandos
3. Fila de Atendimento
4. Pontuação & Ranking
5. Configurações

## 📱 Telas Implementadas

### T1. Login
- Campos: email, senha
- Link "Esqueci senha"
- Nota de papel: perfis Admin/Tutor

### T2. Dashboard (Admin)
- 6 cards KPI: total alfabetizandos, ativos hoje, travados, inativos 7d, média acerto, tempo resposta
- Gráfico de linha: progresso ao longo do tempo
- Tabela: alertas críticos
- Filtros: 7/30/90 dias

### T3. Dashboard (Alfabetizador)
- 4 cards KPI: alunos ativos, travados, pedidos abertos, alunos em risco
- Lista: pedidos recentes
- Lista: alunos que mais evoluíram

### T4. Lista de Alfabetizandos
- Tabela com filtros avançados
- Colunas: nome, grupo, etapa, % progresso, status, última atividade
- Paginação
- **DEMO**: Botões para alternar entre estados (loaded/loading/empty/error)

### T5. Detalhe do Alfabetizando
- Header: informações do aluno
- Timeline: progresso por etapa
- Tabela: tentativas e erros
- Galeria: submissões (foto/áudio) com aprovação
- Histórico: atendimentos, locks, desbloqueios
- Modal: destravar com motivo

### T6. Alfabetizadores
- Tabela: tutores com métricas (# alunos, taxa resposta, travados, pontuação)

### T7. Vínculos e Convites
- 3 abas: Pendentes / Confirmados / Negados
- Busca: CPF/telefone/nome
- Ações: confirmar/negar com modal e motivo

### T8. Grupos
- Cards de grupos com informações
- Aviso visual: grupos avançados (entrada bloqueada)
- Modal: criar grupo

### T9. Fila de Atendimento
- Tabela inbox: tipo, aluno, etapa/atividade, status, tempo, prioridade
- Drawer lateral: detalhes + ações rápidas
- Filtros: tipo, status, prioridade, tutor

### T10. Conteúdo (CMS)
- 4 abas: Temas / Etapas / Atividades / Assets
- Upload de arquivos com progresso visual
- Estados: uploading, success, error
- Atividades com drag-and-drop (visual)
- Status: rascunho/publicado

### T11. Pontuação & Ranking
- Ranking de alunos e tutores (abas)
- Card lateral: regras de pontuação
- Extrato (ledger): histórico detalhado
- Filtros: período, grupo, tutor

### T12. Relatórios
- Cards de resumo: tipos de relatórios
- Filtros avançados
- Tabela paginada: dados do relatório
- Botões: exportar CSV/Excel

### T13. Configurações
- 3 abas: Perfil / Parâmetros do Sistema / Papéis (Admin)
- Perfil: dados pessoais, alterar senha
- Sistema: limites (lock, inatividade), textos padrão
- Papéis: gerenciamento de permissões (Admin only)

## 🔧 Tecnologias

- React 18
- React Router 7 (Data Mode)
- Tailwind CSS v4
- Lucide React (ícones)
- Recharts (gráficos)

## 🚀 Rodar o Projeto

O wireframe está funcional e navegável. Para acessar:

1. Inicie em `/login`
2. Clique em "Entrar" para acessar o dashboard
3. Use a sidebar para navegar entre as telas
4. Na tela "Alfabetizandos", teste os estados usando os botões DEMO

## 📝 Contexto Funcional

### App Mobile (consumidor)
- Alunos acessam conteúdos (temas/etapas/atividades)
- Enviam progresso, tentativas/erros, pedidos de ajuda
- Submetem fotos/áudios para avaliação

### Painel Web (gestão)
- Administração de conteúdo (CMS)
- Gestão de usuários e vínculos tutor↔aluno
- Grupos e fila de atendimento
- Estatísticas, ranking, pontuação
- Controle de locks/desbloqueios
- Análise de inatividade

### Arquitetura (conceito)
- Auth: Supabase Auth
- Database: Supabase Postgres
- Storage: Supabase Storage (vídeos/fotos/áudios)

## 🎯 Fluxos Principais

1. **Confirmar/Recusar Vínculo**: Modal com motivo obrigatório
2. **Bloquear/Desbloquear Aluno**: Sistema de locks por erros consecutivos
3. **Aprovar Submissão**: Preview de foto/áudio + ação aprovar/reprovar
4. **Analisar Inatividade**: Filtros e alertas para alunos sem acesso

## 📐 Componentes Reutilizáveis

- `Layout`: Sidebar + Topbar + conteúdo
- `Sidebar`: Navegação por perfil
- `Topbar`: Busca + notificações + usuário
- `KPICard`: Card de métricas
- `StateDisplay`: Estados loading/empty/error

## ⚠️ Notas Importantes

- Este é um **wireframe**, não o design final
- Foco em **hierarquia e fluxo**, não em identidade visual
- Usa **placeholders** para texto/imagens
- Estados de loading/empty/error estão implementados
- Modais e drawers estão funcionais
- Filtros e paginação são visuais (não conectados a dados reais)
