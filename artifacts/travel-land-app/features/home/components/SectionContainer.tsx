import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { useColors } from '@/hooks/useColors';
import { radii, spacing } from '@/constants/theme';

interface SectionContainerProps {
  title: string;
  onViewAll?: () => void;
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  onRetry: () => void;
  emptyMessage?: string;
  errorMessage?: string;
  children: React.ReactNode;
}

export function SectionContainer({ title, onViewAll, isLoading, isError, isEmpty, onRetry, emptyMessage, errorMessage, children }: SectionContainerProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View><Text style={[styles.kicker, { color: colors.primary }]}>CURATED DISCOVERY</Text><Text style={[styles.title, { color: colors.foreground }]}>{title}</Text></View>
        {onViewAll && (
          <Pressable accessibilityRole="button" accessibilityLabel={`View all ${title}`} onPress={onViewAll} style={styles.viewAll}>
            <Text style={[styles.viewAllText, { color: colors.primary }]}>See all</Text>
            <View style={[styles.arrow, { backgroundColor: colors.secondary }]}><Feather name="arrow-right" size={13} color={colors.primary} />
            </View>
          </Pressable>
        )}
      </View>
      
      {isLoading && (
        <View accessibilityLabel={`Loading ${title.toLowerCase()}`} style={styles.row}>
          {[0, 1].map((item) => (
            <View key={item} style={[styles.skeletonCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.skeletonImage, { backgroundColor: colors.muted }]} />
              <View style={[styles.skeletonLine, { backgroundColor: colors.muted, width: '72%' }]} />
              <View style={[styles.skeletonLineSmall, { backgroundColor: colors.muted }]} />
            </View>
          ))}
        </View>
      )}

      {!isLoading && isError && (
        <View style={[styles.state, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="alert-circle" size={24} color={colors.destructive} />
          <Text style={{ color: colors.foreground, marginTop: 8, fontWeight: '600', textAlign: 'center' }}>
            {errorMessage ?? `Failed to load ${title.toLowerCase()}`}
          </Text>
          <Pressable
            testID={`retry-${title}`}
            accessibilityRole="button"
            accessibilityLabel={`Retry loading ${title.toLowerCase()}`}
            onPress={onRetry}
            style={[styles.retry, { backgroundColor: colors.primary }]}
          >
            <Text style={{ color: colors.primaryForeground, fontWeight: '600', fontSize: 13 }}>Retry</Text>
          </Pressable>
        </View>
      )}

      {!isLoading && !isError && isEmpty && (
        <View style={[styles.state, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="box" size={24} color={colors.mutedForeground} />
          <Text style={{ color: colors.mutedForeground, marginTop: 8, fontWeight: '500' }}>{emptyMessage ?? `No ${title.toLowerCase()} found.`}</Text>
        </View>
      )}

      {!isLoading && !isError && !isEmpty && children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.xl, marginBottom: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginHorizontal: spacing.lg, marginBottom: spacing.md },
  kicker: { fontSize: 8, fontWeight: '800', letterSpacing: 1.25, marginBottom: 5 },
  title: { fontSize: 21, lineHeight: 26, fontWeight: '700', letterSpacing: -0.4 },
  viewAll: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6 },
  viewAllText: { fontSize: 11, fontWeight: '800' },
  arrow: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg },
  skeletonCard: { width: 222, height: 204, borderRadius: radii.lg, borderWidth: 1, padding: spacing.sm },
  skeletonImage: { height: 124, borderRadius: radii.md },
  skeletonLine: { height: 13, borderRadius: 7, marginTop: spacing.md },
  skeletonLineSmall: { width: '48%', height: 10, borderRadius: 5, marginTop: spacing.sm },
  state: { marginHorizontal: spacing.lg, minHeight: 180, justifyContent: 'center', alignItems: 'center', borderRadius: radii.lg, borderWidth: 1, padding: spacing.lg },
  retry: { marginTop: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radii.sm },
});
