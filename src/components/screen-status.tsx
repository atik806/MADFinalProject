import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/features/officials/shared/constants/theme';
import { useTranslation } from '@/hooks/use-translation';

/**
 * Shared loading / error views for screens that fetch data from the API.
 * Every farmer data screen renders one of these instead of a blank page while
 * a request is in flight or after it fails. Both are accessibility-labelled.
 */

export function LoadingState({ label }: { label?: string }) {
  const colors = useColors();
  const { t } = useTranslation();
  const text = label ?? t('loading');
  return (
    <View
      style={styles.wrap}
      accessibilityRole="progressbar"
      accessibilityLabel={text}>
      <ActivityIndicator size="large" color={colors.deepGreen} />
      <Text style={[styles.body, { color: colors.dashboard.textSecondary }]}>{text}</Text>
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string | null;
  onRetry?: () => void;
}) {
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <Ionicons name="cloud-offline-outline" size={48} color={colors.dashboard.redDown} />
      <Text style={[styles.title, { color: colors.dashboard.textPrimary }]}>
        {t('somethingWentWrong')}
      </Text>
      <Text style={[styles.body, { color: colors.dashboard.textSecondary }]}>
        {message || t('couldNotLoad')}
      </Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={t('retry')}
          hitSlop={8}
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: colors.deepGreen },
            pressed && styles.btnPressed,
          ]}>
          <Ionicons name="refresh" size={16} color="#fff" />
          <Text style={styles.btnText}>{t('retry')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  body: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 18,
    height: 42,
    borderRadius: 12,
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
