import { Platform, ScrollView, ScrollViewProps } from 'react-native';

type Props = ScrollViewProps & {
  bottomOffset?: number;
};

export function KeyboardAwareScrollViewCompat({
  children,
  keyboardShouldPersistTaps = 'handled',
  bottomOffset: _bottomOffset,
  ...props
}: Props) {
  if (Platform.OS === 'web') {
    return (
      <ScrollView
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        {...props}
      >
        {children}
      </ScrollView>
    );
  }
  return <ScrollView keyboardShouldPersistTaps={keyboardShouldPersistTaps} {...props}>{children}</ScrollView>;
}
