import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { httpClient } from '../../infra/api/http-client';
import { BellIcon } from './BellIcon';

// Sino do header do educador: navega para a tela de Notificações e mostra o
// badge com a contagem de não-lidas (recarrega ao focar a tela).
export function EducatorBell({ educatorId }: { educatorId?: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<any>();
  const [unread, setUnread] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (educatorId) {
        void httpClient
          .get<{ unread: number }>(`/painel/notifications?recipientId=${educatorId}&recipientRole=tutor&unreadOnly=true`)
          .then((r) => { if (active) setUnread(r?.unread ?? 0); })
          .catch(() => {});
      }
      return () => { active = false; };
    }, [educatorId]),
  );

  return (
    <Pressable
      onPress={() => navigation.navigate('EducatorNotificacoes', { educatorId })}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Abrir notificações"
    >
      <BellIcon size={22} />
      {unread > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 99 ? '99+' : String(unread)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#ffffff', fontSize: 10, fontWeight: '800' },
});
