import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const PHRASE_WORDS = ['PESSOA', 'QUE', 'TRANSFORMA', 'PESSOA!'];
const PHRASE_CHARS = PHRASE_WORDS.join('').replace('!', '');
const TOTAL_CHARS = PHRASE_CHARS.length + 1; // +1 for '!'

interface Props {
  lettersUnlocked: number;
}

export function PhraseProgressWidget({ lettersUnlocked }: Props) {
  let charIndex = 0;

  return (
    <View style={styles.container}>
      {PHRASE_WORDS.map((word, wordIdx) => (
        <View key={wordIdx} style={styles.wordRow}>
          {word.split('').map((char) => {
            const idx = charIndex++;
            const unlocked = idx < lettersUnlocked;
            return (
              <Text key={idx} style={[styles.letter, unlocked ? styles.unlocked : styles.locked]}>
                {char}
              </Text>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export { TOTAL_CHARS };

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    gap: 4,
  },
  wordRow: {
    flexDirection: 'row',
  },
  letter: {
    fontSize: 36,
    fontFamily: 'HinaMincho_400Regular',
    letterSpacing: 1,
    lineHeight: 44,
  },
  unlocked: {
    color: '#000000',
  },
  locked: {
    color: 'rgba(0,0,0,0.15)',
  },
});
