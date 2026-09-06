import { PlatformIcon as Feather } from '@/components/PlatformIcon';
import { useSignUp } from '@clerk/expo';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useMobileAuth } from '@/context/AuthContext';

type ClerkErrorLike = { code?: string };

function verificationErrorMessage(error: unknown, fallback: string) {
  const code = (error as ClerkErrorLike | null)?.code?.toLowerCase() ?? '';
  if (code.includes('verification_code_expired') || code.includes('code_expired')) {
    return 'That verification code has expired. Request a new code and try again.';
  }
  if (code.includes('verification_code_invalid') || code.includes('invalid_code') || code.includes('incorrect_code')) {
    return 'That verification code is incorrect. Check the code and try again.';
  }
  if (code.includes('too_many') || code.includes('rate_limit')) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  return fallback;
}

export default function VerifyScreen() {
  const colors=useColors(), insets=useSafeAreaInsets(); const {signUp,fetchStatus}=useSignUp(); const { pendingSupabaseSignupEmail, verifySupabaseSignup, resendSupabaseSignupCode, clearPendingSupabaseSignup }=useMobileAuth(); const [code,setCode]=useState(''); const [message,setMessage]=useState(''); const [isVerifying,setIsVerifying]=useState(false); const [isResending,setIsResending]=useState(false);
  const loading=fetchStatus==='fetching'||isVerifying||isResending;
  const verify=async()=>{if(isVerifying)return; setMessage(''); setIsVerifying(true); try { if(pendingSupabaseSignupEmail){await verifySupabaseSignup(code);}else{const {error}=await signUp.verifications.verifyEmailCode({code}); if(error)return setMessage(verificationErrorMessage(error,'That code did not work. Please try again.')); if(signUp.status!=='complete')return setMessage('Please check the code and try again.'); await signUp.finalize({});} } catch (error) { setMessage(verificationErrorMessage(error,'We could not verify your email. Please try again.')); } finally { setIsVerifying(false); }};
  const resend=async()=>{if(isResending)return; setMessage(''); setIsResending(true); try { if(pendingSupabaseSignupEmail){await resendSupabaseSignupCode();}else{const {error}=await signUp.verifications.sendEmailCode(); if(error)return setMessage(verificationErrorMessage(error,'We could not send a new verification code. Please try again.'));} setMessage('A new verification code was sent.'); } catch (error) { setMessage(verificationErrorMessage(error,'We could not send a new verification code. Please try again.')); } finally { setIsResending(false); }};
  if(pendingSupabaseSignupEmail)return <View style={[s.container,{backgroundColor:colors.background,paddingTop:insets.top+16}]}><Pressable disabled={loading} onPress={()=>{clearPendingSupabaseSignup();router.back();}}><Feather name="arrow-left" size={21} color={colors.foreground}/></Pressable><View style={s.body}><Text style={[s.title,{color:colors.foreground}]}>Check your email.</Text><Text style={[s.subtitle,{color:colors.mutedForeground}]}>We sent a confirmation link to {pendingSupabaseSignupEmail}. Open that link on this device to verify your Travel & Land account and finish signing in.</Text>{!!message&&<Text style={[s.error,{color:colors.destructive}]}>{message}</Text>}<Pressable disabled={loading} onPress={resend}><Text style={[s.resend,{color:colors.primary}]}>{isResending?'Sending a new link…':'Send confirmation link again'}</Text></Pressable></View></View>;
  return <View style={[s.container,{backgroundColor:colors.background,paddingTop:insets.top+16}]}><Pressable disabled={loading} onPress={()=>router.back()}><Feather name="arrow-left" size={21} color={colors.foreground}/></Pressable><View style={s.body}><Text style={[s.title,{color:colors.foreground}]}>Check your email.</Text><Text style={[s.subtitle,{color:colors.mutedForeground}]}>Enter the six-digit code we sent to verify your Travel & Land account.</Text><TextInput testID="verification-code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} placeholder="000000" placeholderTextColor={colors.mutedForeground} style={[s.code,{color:colors.foreground,borderColor:colors.input,backgroundColor:colors.card}]}/>{!!message&&<Text style={[s.error,{color:colors.destructive}]}>{message}</Text>}<Pressable disabled={code.length!==6||loading} onPress={verify} style={[s.button,{backgroundColor:code.length===6&&!loading?colors.primary:colors.muted}]}>{loading?<ActivityIndicator color={colors.primaryForeground}/>:<Text style={[s.buttonText,{color:colors.primaryForeground}]}>Verify email</Text>}</Pressable><Pressable disabled={loading} onPress={resend}><Text style={[s.resend,{color:colors.primary}]}>{isResending?'Sending a new code…':'Send a new code'}</Text></Pressable></View></View>;
}
const s=StyleSheet.create({container:{flex:1,paddingHorizontal:22},body:{marginTop:105},title:{fontSize:29,fontWeight:'700'},subtitle:{fontSize:14,lineHeight:21,marginTop:10},code:{height:61,borderWidth:1,borderRadius:16,fontSize:25,fontWeight:'700',letterSpacing:10,textAlign:'center',marginTop:26},error:{fontSize:13,marginTop:10},button:{height:54,borderRadius:16,alignItems:'center',justifyContent:'center',marginTop:13},buttonText:{fontSize:14,fontWeight:'700'},resend:{textAlign:'center',fontSize:13,fontWeight:'700',marginTop:19}});