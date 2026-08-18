import { PropsWithChildren, useContext, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LearnerChromeContext } from '../learnerSessionContext';
import { EducatorBottomMenu } from '../../educator/components/EducatorBottomMenu';
import { LearnerBottomMenu, LearnerMenuKey } from './LearnerBottomMenu';
import { LearnerHeaderBar } from './LearnerHeaderBar';
import { LearnerHintVideoOverlay } from './LearnerHintVideoOverlay';
import { learnerTheme } from '../learnerTheme';

// Cruz grande sobreposta ao banner AGUARDANDO AJUDA. Segue o desenho do
// Figma "Etapas 2 e 3 - Tela bloqueada": dois tracos diagonais brancos.
function PendingCrossIcon() {
  return (
    <Svg width={42} height={42} viewBox="0 0 42 42" fill="none">
      <Path d="M6 6 L36 36" stroke="#ffffff" strokeWidth={5} strokeLinecap="round" />
      <Path d="M36 6 L6 36" stroke="#ffffff" strokeWidth={5} strokeLinecap="round" />
    </Svg>
  );
}

// Telefone com bolha de fala simplificado, tambem do Figma. O traco e
// branco, igual ao texto, mantendo o contraste com o fundo vermelho.
function PendingPhoneIcon() {
  return (
    <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
      <Path
        d="M6 9 C6 7 7 6 9 6 L11 6 C12 6 13 7 13 8 L13 11 C13 12 12 13 11 13 L10 13 C10 17 13 20 17 20 L17 19 C17 18 18 17 19 17 L22 17 C23 17 24 18 24 19 L24 21 C24 23 23 24 21 24 C12 24 6 18 6 9 Z"
        fill="#ffffff"
      />
      <Path
        d="M18 5 C23 5 27 9 27 14"
        stroke="#ffffff"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// Icone visual de "preciso de ajuda" para o aluno que ainda nao sabe ler.
// Maozinha levantada estilizada — sinaliza o gesto natural do aluno em sala
// de aula para pedir apoio. Aparece apenas quando o exercicio trava (3
// erros) para nao poluir a tela em estado normal.
function RaisedHandIcon() {
  return (
    <Svg width={34} height={34} viewBox="0 0 32 32" fill="none">
      <Path
        d="M11 6 C11 4.8 12 4 13 4 C14 4 15 4.8 15 6 L15 14"
        stroke="#ffffff"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M15 8 C15 6.8 16 6 17 6 C18 6 19 6.8 19 8 L19 15"
        stroke="#ffffff"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M19 9 C19 7.8 20 7 21 7 C22 7 23 7.8 23 9 L23 16"
        stroke="#ffffff"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M7 12 C7 10.8 8 10 9 10 C10 10 11 10.8 11 12 L11 18"
        stroke="#ffffff"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M7 16 C7 18 7 22 9 24 C12 27 16 28 19 28 C23 28 26 25 26 21 L26 13"
        stroke="#ffffff"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Ícone de play para o card de dica — círculo preto com triângulo branco.
function PlayCircleIcon() {
  return (
    <Svg width={48} height={48} viewBox="0 0 48 48" fill="none">
      <Path
        d="M24 4C13 4 4 13 4 24C4 35 13 44 24 44C35 44 44 35 44 24C44 13 35 4 24 4Z"
        fill="#111111"
      />
      <Path d="M20 17L33 24L20 31V17Z" fill="#ffffff" />
    </Svg>
  );
}

interface LearnerScreenLayoutProps extends PropsWithChildren {
  activeMenu?: LearnerMenuKey;
  onMenuHome?: () => void;
  onMenuTutorial?: () => void;
  onMenuScore?: () => void;
  onMenuProfile?: () => void;
  roleLabel?: string;
  learnerName?: string | null;
  stageLabel?: string | null;
  isSessionLocked?: boolean;
  onRequestHelp?: () => void;
  helpAcknowledgedAt?: string | null;
  isHelpPending?: boolean;
  // Em telas comuns (video, imagem, texto, exercicio em andamento) o
  // botao de pedir ajuda fica oculto: o alfabetizando ainda nao sabe ler
  // e nao precisa de um botao textual disponivel o tempo todo. O botao
  // visual de pedir apoio so aparece quando esta flag e true — usado pela
  // tela de exercicio quando o aluno trava (3 erros).
  canRequestHelp?: boolean;
  sessionErrorMessage?: string | null;
  hintVideoUrl?: string | null;
  // Telas de exercício do Figma (Marcar Caixas / Quadrado da Letra) não têm
  // texto no header nem menu inferior — apenas o logo. O foco fica todo na
  // atividade; a navegação acontece pela seta AVANÇAR.
  minimalChrome?: boolean;
}

export function LearnerScreenLayout({
  children,
  activeMenu = 'inicio',
  onMenuHome,
  onMenuTutorial,
  onMenuScore,
  onMenuProfile,
  roleLabel,
  learnerName,
  stageLabel,
  isSessionLocked = false,
  onRequestHelp,
  helpAcknowledgedAt,
  isHelpPending = false,
  canRequestHelp = false,
  sessionErrorMessage,
  hintVideoUrl,
  minimalChrome = false,
}: LearnerScreenLayoutProps) {
  const [hintOpen, setHintOpen] = useState(false);
  const { hideBottomMenu, educatorMenu } = useContext(LearnerChromeContext);
  const hasHint = Boolean(hintVideoUrl);
  // No runner da Etapa 1 (educador) o menu do aluno é escondido, mas a barra de
  // 5 abas do EDUCADOR é exibida em todas as telas — inclusive nas de exercício
  // (Figma "Modelo letra"), onde `minimalChrome` normalmente esconderia o menu.
  const showBottomMenu = !minimalChrome && !hideBottomMenu;
  const showEducatorMenu = Boolean(educatorMenu);
  const bottomPadding = hasHint ? 210 : showBottomMenu || showEducatorMenu ? 130 : 90;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: bottomPadding }]}>
        <View style={styles.shell}>
          {minimalChrome ? (
            <LearnerHeaderBar />
          ) : (
            <LearnerHeaderBar roleLabel={roleLabel} learnerName={learnerName} stageLabel={stageLabel} />
          )}
          {sessionErrorMessage ? (
            <View style={styles.alertError}>
              <Text style={styles.alertErrorText}>{sessionErrorMessage}</Text>
            </View>
          ) : null}
          {isSessionLocked || isHelpPending ? (
            // Estado "tela bloqueada". Banner grande vermelho, visual (X +
            // telefone), ocupando a largura toda (Figma: Etapas 2 e 3 - Tela
            // bloqueada). O alfabetizando NÃO lê, então a tela travada é
            // comunicada apenas por este banner — sem cartões de texto.
            <View style={styles.pendingBanner}>
              <Text style={styles.pendingBannerText}>
                AGUARDANDO{"\n"}AJUDA
              </Text>
              <View style={styles.pendingBannerIcons}>
                <PendingCrossIcon />
                <PendingPhoneIcon />
              </View>
            </View>
          ) : null}
          {onRequestHelp && !isHelpPending && canRequestHelp ? (
            // Botao visual de pedir ajuda. So aparece quando o aluno
            // travou em um exercicio (3 erros). Visual (icone de mao
            // levantada) em vez de texto, ja que o aluno nao le ainda.
            <View style={styles.helpRow}>
              <Pressable
                style={styles.helpVisualButton}
                onPress={onRequestHelp}
                accessibilityLabel="Pedir ajuda ao alfabetizador"
                accessibilityRole="button"
              >
                <RaisedHandIcon />
              </Pressable>
              {helpAcknowledgedAt ? (
                <Text style={styles.helpAckText}>Ajuda recebida</Text>
              ) : null}
            </View>
          ) : null}
          <View style={styles.body}>{children}</View>

          {hasHint ? (
            // Card de dica no FLUXO da página (Figma: entre as setas e o
            // menu). Fora do scroll ele caía abaixo da dobra no web e
            // ficava invisível.
            <Pressable
              style={styles.hintCard}
              onPress={() => setHintOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Abrir tutorial de apoio"
            >
              <View style={styles.hintCardText}>
                <Text style={styles.hintCardTitle}>Está com dúvidas?</Text>
                <Text style={styles.hintCardBody}>
                  Confira o trecho do tutorial que explica sobre este tipo de atividade.
                </Text>
              </View>
              <PlayCircleIcon />
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      {showEducatorMenu && educatorMenu ? (
        <EducatorBottomMenu
          active={educatorMenu.active}
          onInicioPress={educatorMenu.onInicio}
          onTutorialPress={educatorMenu.onTutorial}
          onAcompanharPress={educatorMenu.onAcompanhar}
          onPontuacaoPress={educatorMenu.onPontuacao}
          onPerfilPress={educatorMenu.onPerfil}
        />
      ) : showBottomMenu ? (
        <LearnerBottomMenu
          active={activeMenu}
          onInicioPress={onMenuHome}
          onTutorialPress={onMenuTutorial}
          onPontuacaoPress={onMenuScore}
          onPerfilPress={onMenuProfile}
        />
      ) : null}

      {hintOpen && hintVideoUrl ? (
        <LearnerHintVideoOverlay
          videoUrl={hintVideoUrl}
          onClose={() => setHintOpen(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: learnerTheme.background,
  },
  container: {
    flexGrow: 1,
    backgroundColor: learnerTheme.background,
    paddingHorizontal: 22,
    paddingTop: 20,
    alignItems: 'center',
  },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    marginTop: 18,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  hintCardText: {
    flex: 1,
    gap: 4,
  },
  hintCardTitle: {
    color: '#111111',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  hintCardBody: {
    color: '#555555',
    fontSize: 13,
    lineHeight: 18,
  },
  shell: {
    width: '100%',
    maxWidth: 390,
  },
  body: {
    marginTop: 14,
  },
  alertError: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#f7b3b3',
    backgroundColor: '#fff1f1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  alertErrorText: {
    color: '#8c1d1d',
    fontSize: 12,
  },
  helpRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  helpVisualButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e30613',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  helpAckText: {
    color: '#2f6a2f',
    fontSize: 12,
    fontWeight: '600',
  },
  pendingBanner: {
    marginTop: 12,
    backgroundColor: '#e11d2c',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  pendingBannerText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.6,
    lineHeight: 21,
    flexShrink: 1,
  },
  pendingBannerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
