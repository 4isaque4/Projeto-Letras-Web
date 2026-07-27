import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

interface LearnerActionButtonsProps {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  backLabel?: string;
  hideBack?: boolean;
  // 'green' (padrão) = setas de exercício com destravamento progressivo (RN106/107).
  // 'dark' = setas de navegação (VOLTAR/AVANÇAR) das telas de abertura, contorno
  // escuro navy, labels em maiúsculas — fiel ao Figma (Etapa - Tela de Abertura).
  // 'filled' = seta única PREENCHIDA verde das telas de exercício do Figma
  // (Marcar Caixas / Quadrado da Letra): verde-claro enquanto o exercício não
  // foi concluído (RN106), verde forte quando liberada.
  variant?: 'green' | 'dark' | 'filled';
  // Estado apenas visual de "ainda não liberado": a seta continua tocável para
  // o exercício responder com áudio/feedback sobre o que falta.
  nextVisualDisabled?: boolean;
  // RN113 (Figma "Etapas 2 e 3"): câmera verde FOTOGRAFAR ATIVIDADE no lugar
  // do VOLTAR — o aluno fotografa o exercício feito no papel.
  onPhoto?: () => void;
  photoLabel?: string;
}

const NEXT_ARROW_FILLED = `
<svg width="55" height="46" viewBox="0 0 55 46" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 17H30V8L51 23L30 38V29H4V17Z" fill="#2fa536"/>
</svg>`;

// Câmera verde preenchida do Figma (Etapas 2 e 3 - Foto do exercício).
const CAMERA_GREEN = `
<svg width="50" height="42" viewBox="0 0 50 42" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M17 7L20.5 2H29.5L33 7H43C45.2 7 47 8.8 47 11V36C47 38.2 45.2 40 43 40H7C4.8 40 3 38.2 3 36V11C3 8.8 4.8 7 7 7H17Z" fill="#2fa536"/>
  <circle cx="25" cy="23" r="8.5" fill="#ffffff"/>
  <circle cx="25" cy="23" r="4.8" fill="#2fa536"/>
</svg>`;

const NEXT_ARROW_FILLED_DISABLED = `
<svg width="55" height="46" viewBox="0 0 55 46" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 17H30V8L51 23L30 38V29H4V17Z" fill="#9be39f"/>
</svg>`;

const NEXT_ARROW_DARK = `
<svg width="55" height="46" viewBox="0 0 55 46" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 17H30V8L51 23L30 38V29H4V17Z" stroke="#101a3d" stroke-width="4" stroke-linejoin="round"/>
</svg>`;

const BACK_ARROW_DARK = `
<svg width="55" height="46" viewBox="0 0 55 46" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M51 17H25V8L4 23L25 38V29H51V17Z" stroke="#101a3d" stroke-width="4" stroke-linejoin="round"/>
</svg>`;

// Setas com dois estados: ativa (verde escuro, pronta para uso) e
// "apagada" (cinza claro, indica indisponivel). Sem texto: o publico
// alfabetizando ainda nao le, entao a unica sinalizacao de
// disponibilidade e o tom da seta.
const NEXT_ARROW_ACTIVE = `
<svg width="55" height="46" viewBox="0 0 55 46" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 17H30V8L51 23L30 38V29H4V17Z" stroke="#2fa536" stroke-width="4" stroke-linejoin="round"/>
</svg>`;

const NEXT_ARROW_DISABLED = `
<svg width="55" height="46" viewBox="0 0 55 46" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 17H30V8L51 23L30 38V29H4V17Z" stroke="#9be39f" stroke-width="4" stroke-linejoin="round"/>
</svg>`;

const BACK_ARROW_ACTIVE = `
<svg width="55" height="46" viewBox="0 0 55 46" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M51 17H25V8L4 23L25 38V29H51V17Z" stroke="#2fa536" stroke-width="4" stroke-linejoin="round"/>
</svg>`;

const BACK_ARROW_DISABLED = `
<svg width="55" height="46" viewBox="0 0 55 46" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M51 17H25V8L4 23L25 38V29H51V17Z" stroke="#9be39f" stroke-width="4" stroke-linejoin="round"/>
</svg>`;

export function LearnerActionButtons({
  onBack,
  onNext,
  nextLabel,
  backLabel,
  hideBack = false,
  variant = 'green',
  nextVisualDisabled = false,
  onPhoto,
  photoLabel,
}: LearnerActionButtonsProps) {
  const backDisabled = !onBack;
  const nextDisabled = !onNext;
  const dark = variant === 'dark';
  const filled = variant === 'filled';
  const backXml = dark ? BACK_ARROW_DARK : backDisabled ? BACK_ARROW_DISABLED : BACK_ARROW_ACTIVE;
  const nextXml = filled
    ? nextVisualDisabled || nextDisabled
      ? NEXT_ARROW_FILLED_DISABLED
      : NEXT_ARROW_FILLED
    : dark
      ? NEXT_ARROW_DARK
      : nextDisabled
        ? NEXT_ARROW_DISABLED
        : NEXT_ARROW_ACTIVE;
  const labelStyle = dark
    ? [styles.label, styles.labelDark]
    : filled
      ? [styles.label, styles.labelFilled, nextVisualDisabled ? styles.labelFilledDisabled : null]
      : styles.label;

  return (
    <View style={styles.row}>
      {onPhoto ? (
        <Pressable style={styles.action} onPress={onPhoto}>
          <SvgXml xml={CAMERA_GREEN} width={50} height={42} />
          {photoLabel ? <Text style={[styles.label, styles.labelFilled]}>{photoLabel}</Text> : null}
        </Pressable>
      ) : hideBack ? (
        <View style={styles.placeholder} />
      ) : (
        <Pressable style={styles.action} onPress={onBack} disabled={backDisabled}>
          <SvgXml xml={backXml} width={55} height={46} />
          {backLabel ? <Text style={labelStyle}>{backLabel}</Text> : null}
        </Pressable>
      )}

      <Pressable style={styles.action} onPress={onNext} disabled={nextDisabled}>
        <SvgXml xml={nextXml} width={55} height={46} />
        {nextLabel ? <Text style={labelStyle}>{nextLabel}</Text> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  action: {
    minWidth: 86,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  placeholder: {
    width: 86,
  },
  label: {
    fontSize: 10,
    color: '#2fa536',
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'lowercase',
  },
  labelDark: {
    color: '#101a3d',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelFilled: {
    color: '#2fa536',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  labelFilledDisabled: {
    color: '#9be39f',
  },
});
