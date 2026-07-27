import React from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { EducatorRootStackParamList } from '../../types';

type Props = NativeStackScreenProps<EducatorRootStackParamList, 'EducatorScoreRules'>;

export function EducatorScoreRulesView({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>{'←'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Pontuação - Cálculo</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Sistema de pontos</Text>

          <Text style={styles.body}>
            10 pontos para cada alfabetizando vinculado a você que concluir a Etapa 1.
          </Text>
          <Text style={styles.body}>
            + 15 pontos para cada alfabetizando vinculado a você que concluir a Etapa 2.
          </Text>
          <Text style={styles.body}>
            + 25 pontos para cada alfabetizando vinculado a você que concluir a Etapa 3.
          </Text>
          <Text style={styles.body}>
            Portanto, cada alfabetizando que concluir o processo de alfabetização dará, no mínimo, 50 pontos a você.
          </Text>

          <Text style={styles.subTitle}>Pontos adicionais:</Text>
          <Text style={styles.body}>
            + 3 pontos para cada avanço de alfabetizando em até 1 hora após o pedido de apoio ou bloqueio; ou
          </Text>
          <Text style={styles.body}>
            + 2 pontos para cada avanço de alfabetizando em até 24 horas após o pedido de apoio ou bloqueio de tela; ou
          </Text>
          <Text style={styles.body}>
            + 1 ponto para cada avanço de alfabetizando em até 3 dias após o pedido de apoio ou bloqueio de tela.
          </Text>

          <Text style={styles.warningTitle}>CUIDADO: Perda de pontos!</Text>
          <Text style={styles.body}>
            Perderá 3 pontos quando o alfabetizando não avançar da tela de dúvida em até 5 dias.
          </Text>
          <Text style={styles.body}>
            Perderá mais 3 pontos a cada 5 dias sem avanço, até o limite de 30 pontos.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  backText: {
    fontSize: 22,
    color: '#000',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    padding: 20,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  subTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginTop: 4,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#c00',
    marginTop: 4,
  },
  body: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
});
