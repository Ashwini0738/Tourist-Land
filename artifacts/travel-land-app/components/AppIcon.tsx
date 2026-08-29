import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { useColors } from '@/hooks/useColors';
import { Pressable, StyleSheet, View } from 'react-native';

export function AppIcon({
  name,
  onPress,
  active = false,
  size = 42,
}: {
  name: React.ComponentProps<typeof Feather>['name'];
  onPress?: () => void;
  active?: boolean;
  size?: number;
}) {
  const colors = useColors();
  const icon = (
    <View
      style={[
        styles.icon,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: active ? colors.primary : colors.card },
      ]}
    >
      <Feather name={name} size={size * 0.43} color={active ? colors.primaryForeground : colors.foreground} />
    </View>
  );
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress}>{icon}</Pressable> : icon;
}

const styles = StyleSheet.create({
  icon: { alignItems: 'center', justifyContent: 'center' },
});