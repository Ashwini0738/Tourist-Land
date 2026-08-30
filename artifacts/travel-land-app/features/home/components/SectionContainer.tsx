import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { useColors } from '@/hooks/useColors';

interface SectionContainerProps {
  title: string;
  onViewAll?: () => void;
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  onRetry: () => void;
  emptyMessage?: string;
  children: React.ReactNode;
}

export function SectionContainer({ title, onViewAll, isLoading, isError, isEmpty, onRetry, emptyMessage, children }: SectionContainerProps) {
  const colors = useColors();

  return (
    <View style={{ marginTop: 16, marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, marginBottom: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground }}>{title}</Text>
        {onViewAll && (
          <Pressable onPress={onViewAll} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.mutedForeground }}>VIEW ALL</Text>
            <View style={{ backgroundColor: '#22C55E', borderRadius: 12, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="arrow-right" size={12} color="#fff" />
            </View>
          </Pressable>
        )}
      </View>
      
      {isLoading && (
        <View accessibilityLabel={`Loading ${title.toLowerCase()}`} style={{ flexDirection: 'row', gap: 14, paddingHorizontal: 20 }}>
          {[0, 1].map((item) => (
            <View key={item} style={{ width: 220, height: 180, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 12 }}>
              <View style={{ height: 104, borderRadius: 12, backgroundColor: colors.muted }} />
              <View style={{ width: '72%', height: 13, borderRadius: 7, backgroundColor: colors.muted, marginTop: 14 }} />
              <View style={{ width: '48%', height: 10, borderRadius: 5, backgroundColor: colors.muted, marginTop: 9 }} />
            </View>
          ))}
        </View>
      )}

      {!isLoading && isError && (
        <View style={{ marginHorizontal: 20, height: 180, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border }}>
          <Feather name="alert-circle" size={24} color={colors.destructive} />
          <Text style={{ color: colors.foreground, marginTop: 8, fontWeight: '600' }}>Failed to load {title.toLowerCase()}</Text>
          <Pressable onPress={onRetry} style={{ marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.primary, borderRadius: 10 }}>
            <Text style={{ color: colors.primaryForeground, fontWeight: '600', fontSize: 13 }}>Retry</Text>
          </Pressable>
        </View>
      )}

      {!isLoading && !isError && isEmpty && (
        <View style={{ marginHorizontal: 20, height: 180, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border }}>
          <Feather name="box" size={24} color={colors.mutedForeground} />
          <Text style={{ color: colors.mutedForeground, marginTop: 8, fontWeight: '500' }}>{emptyMessage ?? `No ${title.toLowerCase()} found.`}</Text>
        </View>
      )}

      {!isLoading && !isError && !isEmpty && children}
    </View>
  );
}
