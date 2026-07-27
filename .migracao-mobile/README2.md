# README2 - Comandos Basicos (App Unificado)

Guia rapido para rodar o novo app unico `apps/mobile-app` (Educador + Aprendiz).

## 1) Setup inicial

No root do projeto:

```bash
cd /home/israel/Documentos/letras
pnpm install
pnpm db:generate
```

Se o pnpm pedir aprovacao de scripts:

```bash
pnpm approve-builds
pnpm install
```

## 2) Subir a API (porta 3000)

```bash
pnpm --filter api dev
```

Testar se API esta no ar:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/health/db
curl http://localhost:3000/reference/ufs
```

Se der erro de porta ocupada (`EADDRINUSE`):

```bash
lsof -iTCP:3000 -sTCP:LISTEN -n -P
kill <PID>
pnpm --filter api dev
```

## 3) Configurar API URL no app unificado

Arquivo:

```text
apps/mobile-app/.env
```

Conteudo base:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000/
VITE_API_BASE_URL=http://localhost:3000
```

## 4) Rodar o app unificado

Atalho recomendado (API + Expo no mesmo terminal):

```bash
pnpm dev:mobile:local
```

Fallback quando LAN travar no Expo Go:

```bash
pnpm dev:mobile:tunnel
```

### Android Emulator (Studio)

```bash
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000 pnpm --filter mobile-app exec expo start --clear
```

Atalho:

```bash
pnpm dev:mobile:emulator
```

Opcional (ADB reverse):

```bash
adb reverse tcp:3000 tcp:3000
```

Com `adb reverse`, tambem pode usar `http://localhost:3000`.

### Android fisico (Expo Go)

Descobrir IP local da maquina:

```bash
hostname -I | awk '{print $1}'
```

Exemplo (troque pelo seu IP):

```bash
EXPO_PUBLIC_API_URL=http://192.168.100.13:3000 pnpm --filter mobile-app exec expo start --lan --clear
```

Regras importantes:
- Celular e PC devem estar na mesma rede Wi-Fi.
- Nao use 5G/dados moveis para esse teste local.
- No celular, `localhost` nao aponta para seu PC.

### Web (browser)

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000 pnpm --filter mobile-app exec expo start --web --clear

EXPO_PUBLIC_API_URL=http://localhost:3000 pnpm --filter mobile-app exec expo start --clear

```

Atalho:

```bash
pnpm dev:mobile:web
```

## 5) Como usar o fluxo no app unificado

1. App abre na tela de escolha de modo (gate): `Educador` ou `Aprendiz`.
2. Escolha `Educador` para login/cadastro/onboarding/perfil.
3. Escolha `Aprendiz` para o fluxo learner.
4. Se houver sessao persistida valida, o app entra direto no fluxo correto.

## 6) Painel web de upload de conteudo

Suba a API e rode o painel web:

```bash
pnpm --filter web dev
```

Abra:

```text
http://localhost:5173
```

No painel, use "Upload de Arquivo" para enviar imagem, video, audio ou SVG.
O endpoint usado e:

```text
POST /painel/conteudo/assets/upload (multipart/form-data, campo: file)
```

## 7) Banco (Prisma)

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

Sincronizar usuarios locais com `auth.users`:

```bash
pnpm --filter api auth:sync-supabase-users
```

## 8) Limpeza de cache quando travar

```bash
pnpm --filter mobile-app exec expo start --clear
```

Se precisar:
- feche o Expo Go no celular;
- abra novamente;
- rode o comando acima de novo.

## 9) Fluxo recomendado (rapido)

1. `pnpm --filter api dev`
2. Emulador Android: usar `http://10.0.2.2:3000`
3. Celular fisico: usar `http://SEU_IP_LOCAL:3000`
4. `pnpm --filter mobile-app exec expo start --lan --clear`
5. Abrir app e validar login/cadastro e carregamento de UFs
