import { Feather } from '@expo/vector-icons';
import { useSignIn, useSignUp } from '@clerk/expo';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthSecurity } from '@/context/AuthSecurityContext';
import { useColors } from '@/hooks/useColors';

export default function LoginScreen() {
  const colors = useColors(); const insets = useSafeAreaInsets();
  const { signIn, fetchStatus: signInStatus } = useSignIn();
  const { signUp, fetchStatus: signUpStatus } = useSignUp();
  const [isNew, setNew] = useState(false); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [message, setMessage] = useState('');
  const loading = signInStatus === 'fetching' || signUpStatus === 'fetching';
  const submit = async () => {
    setMessage('');
    if (isNew) {
      const { error } = await signUp.password({ emailAddress: email.trim(), password });
      if (error) return setMessage('We could not create that account. Please review your email and password and try again.');
      await signUp.verifications.sendEmailCode();
      router.push('/verify');
      return;
    }
    const { error } = await signIn.password({ emailAddress: email.trim(), password });
    if (error) return setMessage('We could not sign you in. Please check your details and try again.');
    if (signIn.status !== 'complete') return setMessage('This sign-in needs another verification step. Please use a different sign-in method or try again.');
    await signIn.finalize({});
    router.replace('/(tabs)');
  };
  return <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}>
    <Pressable testID="login-back" onPress={() => router.replace('/splash')}><Feather name="arrow-left" size={21} color={colors.foreground} /></Pressable>
    <View style={styles.copy}><Text style={[styles.kicker, { color: colors.primary }]}>{isNew ? 'JOIN THE JOURNEY' : 'WELCOME BACK'}</Text><Text style={[styles.title, { color: colors.foreground }]}>{isNew ? 'Start exploring.' : 'Your next chapter\nstarts here.'}</Text><Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{isNew ? 'Create an account to save the places that feel like home.' : 'Sign in to keep your stays, bookings, and saved places together.'}</Text>
      <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Email address" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]} />
      <TextInput value={password} onChangeText={setPassword} autoCapitalize="none" secureTextEntry placeholder="Password" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.input, backgroundColor: colors.card }]} />
      {!!message && <Text style={[styles.error, { color: colors.destructive }]}>{message}</Text>}
      <Pressable testID="login-continue" disabled={!email || !password || loading} onPress={submit} style={[styles.button, { backgroundColor: email && password && !loading ? colors.primary : colors.muted }]}>{loading ? <ActivityIndicator color={colors.primaryForeground} /> : <><Text style={[styles.buttonText, { color: colors.primaryForeground }]}>{isNew ? 'Create account' : 'Sign in'}</Text><Feather name="arrow-right" size={17} color={colors.primaryForeground} /></>}</Pressable>
      <Pressable onPress={() => { setNew(!isNew); setMessage(''); }} style={styles.secondary}><Text style={[styles.secondaryText, { color: colors.primary }]}>{isNew ? 'Already have an account? Sign in' : 'New here? Create an account'}</Text></Pressable>
      {isNew && <View nativeID="clerk-captcha" />}
    </View>
  </View>;
}
const styles = StyleSheet.create({ container:{flex:1,paddingHorizontal:22},copy:{marginTop:72},kicker:{fontSize:11,fontWeight:'700',letterSpacing:1.5,marginBottom:9},title:{fontSize:31,lineHeight:37,fontWeight:'700',letterSpacing:-.8},subtitle:{fontSize:14,lineHeight:21,marginTop:12},input:{height:56,borderWidth:1,borderRadius:16,paddingHorizontal:15,fontSize:14,marginTop:16},error:{fontSize:13,lineHeight:18,marginTop:12},button:{height:54,borderRadius:16,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:9,marginTop:16},buttonText:{fontSize:14,fontWeight:'700'},secondary:{alignItems:'center',marginTop:18},secondaryText:{fontSize:13,fontWeight:'700'} });