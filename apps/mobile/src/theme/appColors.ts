/**
 * Paleta canônica do app (design tokens) — FONTE ÚNICA de cor.
 *
 * O app cresceu com cores cravadas na unha: hoje há dezenas de tons
 * quase-idênticos para o mesmo papel (ex.: texto principal aparece como
 * #111111, #101010, #141414, #1a1a1a, #000000...). Isso é a raiz da
 * incoerência visual. Este arquivo colapsa cada papel num valor único.
 *
 * Regra: componentes NÃO devem escrever hex direto — importam `colors` daqui.
 * Rollout é incremental (ver docs/paleta-coerencia.md); o `learnerTheme` do
 * aprendiz deve, com o tempo, ser reescrito em cima destes tokens.
 */
export const colors = {
  // ── Tinta / texto ────────────────────────────────────────────────
  ink: '#111111', // texto e ícones principais (colapsa #101010,#141414,#1a1a1a,#000,#111)
  inkMuted: '#6b7280', // texto secundário / legendas (colapsa #8f8f8f,#888888,#7a7a7a,#777)
  inkFaint: '#9ca3af', // placeholder / desabilitado

  // ── Superfícies ──────────────────────────────────────────────────
  surface: '#ffffff',
  surfaceMuted: '#f3f4f6', // cartões/pílulas neutras (gray-100)
  background: '#efefef',
  border: '#e4e4e4', // divisórias / bordas leves (colapsa #e5e7eb,#e0e0e0,#eeeeee)
  borderStrong: '#d1d5db',

  // ── Marca ────────────────────────────────────────────────────────
  brandGreen: '#2fa536', // ação "avançar" / primária (seta AVANÇAR, +novo)
  brandNavy: '#20385f', // títulos / marca secundária

  // ── Semântico: sucesso (verde) ───────────────────────────────────
  success: '#1f7a4d', // texto/ícone de sucesso
  successBg: '#e9f7ef',
  successBorder: '#9be39f',

  // ── Semântico: perigo/erro (vermelho) ────────────────────────────
  danger: '#b91c1c', // texto/borda de erro
  dangerStrong: '#e11d2c', // fundo forte (badge AGUARDANDO AJUDA)
  dangerBg: '#fdecec',

  // ── Semântico: atenção/pedido de apoio (laranja) ─────────────────
  // Reservado para AÇÃO que pede atenção ativa (banner de pedido de apoio).
  // NÃO usar para estados passivos "ainda não liberado" — esses são neutros.
  attention: '#c2410c',
  attentionBg: '#fff7ed',
  attentionBorder: '#fed7aa',

  // ── Semântico: neutro / bloqueado / "ainda não" (gate passivo) ───
  neutral: '#6b7280', // texto/ícone
  neutralBg: '#f3f4f6',
  neutralBorder: '#e4e4e4',
} as const;

export type AppColor = keyof typeof colors;
