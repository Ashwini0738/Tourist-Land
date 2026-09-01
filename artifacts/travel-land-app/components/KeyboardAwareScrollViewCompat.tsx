import { KeyboardAvoidingView, Platform, ScrollView, ScrollViewProps } from 'react-native';

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
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
      style={{ flex: 1 }}
    >
      <ScrollView
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyboardDismissMode="on-drag"
        {...props}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
