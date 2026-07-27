import { useAssets } from 'expo-asset';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SvgUri, SvgXml } from 'react-native-svg';
import { EducatorBell } from '../shared/EducatorBell';
import { LearnerActionButtons } from '../learner/components/LearnerActionButtons';
import { EducatorBottomMenu } from './components/EducatorBottomMenu';

// Telas de entrada da Etapa 1, fiéis ao Figma ("Etapa 1 - Orientações" e
// "Etapa 1 - Tela de Abertura"). São passos anteriores à lista de aulas do
// runner — o alfabetizador lê as orientações, confere os conteúdos da etapa e
// só então começa a conduzir. Não há botão "SAIR DA ETAPA 1" no Figma: a saída
// é pelo menu inferior (aba "início").

const PLAY_ICON = `
<svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="36" cy="36" r="34" fill="#d9f2da" stroke="#ffffff" stroke-width="3"/>
  <path d="M29 22L52 36L29 50V22Z" fill="#101a3d"/>
</svg>`;

// Conteúdos da Etapa 1 conforme o Figma (lista fixa — decisão do Israel).
// Obs.: o Figma grafa "Consicência fonêmica"; usamos a forma correta.
const CONTEUDOS_ETAPA_1 = [
  'Alfabeto',
  'Vogais',
  'Encontros Vocálicos',
  'Sílabas',
  'Consciência fonêmica',
  'Escrita de palavras',
  'Escrita do próprio nome',
];

export interface EtapaIntroMenu {
  onInicio: () => void;
  onTutorial: () => void;
  onAcompanhar: () => void;
  onPontuacao: () => void;
  onPerfil: () => void;
}

function IntroHeader({ educatorId }: { educatorId?: string }) {
  const [assets] = useAssets([require('../../../assets/Logo-LETRAS-2.svg')]);
  const logoUri = assets?.[0]?.localUri ?? assets?.[0]?.uri;
  return (
    <View style={styles.header}>
      {logoUri ? <SvgUri uri={logoUri} width={84} height={50} /> : <View style={styles.logoPlaceholder} />}
      <EducatorBell educatorId={educatorId} />
    </View>
  );
}

function IntroMenu({ menu }: { menu: EtapaIntroMenu }) {
  return (
    <EducatorBottomMenu
      active="inicio"
      onInicioPress={menu.onInicio}
      onTutorialPress={menu.onTutorial}
      onAcompanharPress={menu.onAcompanhar}
      onPontuacaoPress={menu.onPontuacao}
      onPerfilPress={menu.onPerfil}
    />
  );
}

// ── Etapa 1 - Orientações ─────────────────────────────────────────────────
export function EducatorEtapa1OrientacoesScreen({
  educatorId,
  menu,
  onIniciar,
  onAbrirTutorial,
}: {
  educatorId?: string;
  menu: EtapaIntroMenu;
  onIniciar: () => void;
  // O Figma cita "o link do tutorial específico sobre essa primeira Etapa".
  // Assistir NÃO é obrigatório nesta tela.
  onAbrirTutorial: () => void;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <IntroHeader educatorId={educatorId} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>ALFABETIZAÇÃO - ETAPA 1</Text>

        <Text style={styles.paragraph}>
          Na Etapa 1, você irá conduzir todo o processo <Text style={styles.bold}>presencialmente</Text>.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>Somente você</Text> irá acessar a plataforma.
        </Text>
        <Text style={styles.paragraph}>Siga cada passo indicado nesta plataforma.</Text>
        <Text style={styles.paragraph}>
          Se tiver dúvidas, reveja os tutoriais de orientação. A seguir, segue o link do tutorial
          específico sobre essa primeira Etapa. Ele é bem curto e didático.
        </Text>
        <Text style={styles.paragraph}>
          Só continue se estiver seguro sobre como conduzir esta etapa.
        </Text>

        <Pressable
          style={styles.videoCard}
          onPress={onAbrirTutorial}
          accessibilityRole="button"
          accessibilityLabel="Abrir o tutorial da Etapa 1"
        >
          <SvgXml xml={PLAY_ICON} width={72} height={72} />
          <Text style={styles.videoCardText}>Tutorial da Etapa 1</Text>
        </Pressable>

        <LearnerActionButtons
          variant="dark"
          hideBack
          onNext={onIniciar}
          nextLabel={'INICIAR\nALFABETIZAÇÃO'}
        />
      </ScrollView>
      <IntroMenu menu={menu} />
    </SafeAreaView>
  );
}

// ── Etapa 1 - Tela de Abertura ────────────────────────────────────────────
export function EducatorEtapa1AberturaScreen({
  educatorId,
  learnerName,
  menu,
  onVoltar,
  onAvancar,
}: {
  educatorId?: string;
  learnerName: string;
  menu: EtapaIntroMenu;
  onVoltar: () => void;
  onAvancar: () => void;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <IntroHeader educatorId={educatorId} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.learnerName}>Nome do Alfabetizando: {learnerName}</Text>

        <Text style={styles.listHeading}>Conteúdos a serem abordados:</Text>
        <View style={styles.list}>
          {CONTEUDOS_ETAPA_1.map((item) => (
            <Text key={item} style={styles.listItem}>
              {item}
            </Text>
          ))}
        </View>

        <LearnerActionButtons
          variant="dark"
          onBack={onVoltar}
          backLabel="VOLTAR"
          onNext={onAvancar}
          nextLabel="AVANÇAR"
        />
      </ScrollView>
      <IntroMenu menu={menu} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  logoPlaceholder: { width: 84, height: 50 },
  content: { paddingHorizontal: 20, paddingBottom: 120 },
  title: { fontSize: 16, color: '#111111', marginBottom: 18, letterSpacing: 0.3 },
  paragraph: { fontSize: 15, lineHeight: 24, color: '#111111', marginBottom: 10 },
  bold: { fontWeight: '700' },
  videoCard: {
    marginTop: 18,
    height: 200,
    borderRadius: 8,
    backgroundColor: '#1d2733',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  videoCardText: { color: '#ffffff', fontSize: 13, fontWeight: '700', letterSpacing: 0.4 },
  learnerName: { fontSize: 15, color: '#111111', marginBottom: 22 },
  listHeading: { fontSize: 15, color: '#111111', marginBottom: 10 },
  list: { gap: 8, paddingLeft: 8 },
  listItem: { fontSize: 15, lineHeight: 22, color: '#111111' },
});
