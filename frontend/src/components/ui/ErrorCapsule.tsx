/**
 * Error Capsule - Modern Error Notification Component
 * Auto-expiring pill-shaped message with scale effect
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ErrorCapsuleProps {
  message: string;
  type?: 'error' | 'success' | 'warning' | 'info';
  duration?: number;
  onDismiss?: () => void;
  visible: boolean;
}

const COLORS = {
  error: { bg: '#FEE2E2', text: '#DC2626', icon: '#DC2626' },
  success: { bg: '#D1FAE5', text: '#059669', icon: '#059669' },
  warning: { bg: '#FEF3C7', text: '#D97706', icon: '#D97706' },
  info: { bg: '#DBEAFE', text: '#2563EB', icon: '#2563EB' },
};

const ICONS = {
  error: 'alert-circle',
  success: 'checkmark-circle',
  warning: 'warning',
  info: 'information-circle',
};

export const ErrorCapsule: React.FC<ErrorCapsuleProps> = ({
  message,
  type = 'error',
  duration = 3000,
  onDismiss,
  visible,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const colors = COLORS[type];
  const icon = ICONS[type];

  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0,
            duration: 200,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => onDismiss?.());
      }, duration);

      return () => clearTimeout(timer);
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.bg,
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <Ionicons name={icon as any} size={20} color={colors.icon} />
      <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
    </Animated.View>
  );
};

// Global error capsule state management
let showErrorCapsule: ((message: string, type?: 'error' | 'success' | 'warning' | 'info') => void) | null = null;

export const setErrorCapsuleHandler = (handler: typeof showErrorCapsule) => {
  showErrorCapsule = handler;
};

export const showError = (message: string) => showErrorCapsule?.(message, 'error');
export const showSuccess = (message: string) => showErrorCapsule?.(message, 'success');
export const showWarning = (message: string) => showErrorCapsule?.(message, 'warning');
export const showInfo = (message: string) => showErrorCapsule?.(message, 'info');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 9999,
  },
  message: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ErrorCapsule;
