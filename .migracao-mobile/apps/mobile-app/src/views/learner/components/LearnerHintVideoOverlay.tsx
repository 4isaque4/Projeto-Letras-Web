import { createElement, useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { ResizeMode, Video } from 'expo-av';
import { learnerTheme } from '../learnerTheme';

interface LearnerHintVideoOverlayProps {
  videoUrl: string;
  onClose: () => void;
  title?: string;
}

export function LearnerHintVideoOverlay({
  videoUrl,
  onClose,
  title = 'Tutorial de Apoio',
}: LearnerHintVideoOverlayProps) {
  const slideX = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    Animated.spring(slideX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 68,
      friction: 12,
    }).start();
  }, [slideX]);

  const handleClose = () => {
    Animated.timing(slideX, {
      toValue: -420,
      duration: 260,
      useNativeDriver: true,
    }).start(onClose);
  };

  return (
    <Animated.View style={[styles.overlay, { transform: [{ translateX: slideX }] }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Pressable
          onPress={handleClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Fechar tutorial de apoio"
          style={styles.closeBtn}
        >
          <Text style={styles.closeBtnText}>✕</Text>
        </Pressable>
      </View>
      <View style={styles.videoWrap}>
        {Platform.OS === 'web'
          ? createElement('video', {
              src: videoUrl,
              controls: true,
              autoPlay: true,
              playsInline: true,
              preload: 'auto',
              style: {
                width: '100%',
                height: '100%',
                display: 'block',
                backgroundColor: '#000000',
                objectFit: 'contain',
              },
            })
          : (
            <Video
              source={{ uri: videoUrl }}
              style={styles.video}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              isLooping={false}
            />
          )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#111111',
  },
  title: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  videoWrap: {
    flex: 1,
    backgroundColor: '#000000',
  },
  video: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
