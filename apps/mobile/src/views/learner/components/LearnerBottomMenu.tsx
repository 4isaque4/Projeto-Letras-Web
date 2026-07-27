import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Menu do alfabetizando tem 4 abas (sem "acompanhar", que é do educador).
export type LearnerMenuKey = 'inicio' | 'tutorial' | 'pontuacao' | 'perfil';

interface LearnerBottomMenuProps {
  active?: LearnerMenuKey;
  onInicioPress?: () => void;
  onTutorialPress?: () => void;
  onPontuacaoPress?: () => void;
  onPerfilPress?: () => void;
}

type HandlerKey = 'onInicioPress' | 'onTutorialPress' | 'onPontuacaoPress' | 'onPerfilPress';

const ICONS: Record<LearnerMenuKey, ReturnType<typeof require>> = {
  inicio:    require('../../../../assets/menu/inicio.png'),
  tutorial:  require('../../../../assets/menu/pontuacao.png'),   // monitor = tutoriais
  pontuacao: require('../../../../assets/menu/acompanhar.png'),  // medalha = pontuação
  perfil:    require('../../../../assets/menu/perfil.png'),
};

const ITEMS: { key: LearnerMenuKey; label: string; onPress: HandlerKey }[] = [
  { key: 'inicio',    label: 'início',    onPress: 'onInicioPress' },
  { key: 'tutorial',  label: 'tutoriais', onPress: 'onTutorialPress' },
  { key: 'pontuacao', label: 'pontuação', onPress: 'onPontuacaoPress' },
  { key: 'perfil',    label: 'perfil',    onPress: 'onPerfilPress' },
];

export function LearnerBottomMenu({
  active,
  onInicioPress,
  onTutorialPress,
  onPontuacaoPress,
  onPerfilPress,
}: LearnerBottomMenuProps) {
  const insets = useSafeAreaInsets();
  const handlers: Record<HandlerKey, (() => void) | undefined> = {
    onInicioPress,
    onTutorialPress,
    onPontuacaoPress,
    onPerfilPress,
  };

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.topBorder} />
      <View style={styles.row}>
        {ITEMS.map(({ key, label, onPress }) => {
          const isActive = active === key;
          const handler = handlers[onPress] as (() => void) | undefined;
          return (
            <Pressable
              key={key}
              style={[styles.item, isActive && styles.itemActive]}
              onPress={handler}
              disabled={!handler}
              android_ripple={{ color: 'rgba(0,0,0,0.08)', borderless: false, radius: 32 }}
            >
              <Image source={ICONS[key]} style={styles.icon} resizeMode="contain" />
              <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
  },
  topBorder: {
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 4,
    paddingHorizontal: 4,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
    gap: 3,
  },
  itemActive: {
    borderTopWidth: 2,
    borderTopColor: '#111111',
    marginTop: -2,
  },
  icon: {
    width: 24,
    height: 24,
  },
  label: {
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: '400',
    textAlign: 'center',
  },
  labelActive: {
    color: '#111111',
    fontWeight: '700',
  },
});
