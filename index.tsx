import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import colors from '@/constants/colors';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export default function AuthScreen() {
  const { user, isLoading: authLoading, login, signup } = useAuth();
  const insets = useSafeAreaInsets();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  React.useEffect(() => {
    if (user && !authLoading) {
      router.replace('/home');
    }
  }, [user, authLoading]);

  if (authLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (user) return null;

  async function handleSubmit() {
    setError('');
    setLoading(true);
    try {
      const result = isLogin
        ? await login(username, password)
        : await signup(username, password);
      if (!result.success) {
        setError(result.error || 'Something went wrong');
      }
    } catch (e) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollViewCompat
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + webTopInset + 60,
            paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 20),
          },
        ]}
        bottomOffset={20}
      >
        <Animated.View entering={FadeInUp.duration(600)} style={styles.logoContainer}>
          <View style={styles.logoBox}>
            <Text style={styles.logoN}>N</Text>
          </View>
          <Text style={styles.logoText}>Nexus</Text>
          <Text style={styles.tagline}>Your AI Assistant</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.formContainer}>
          <Text style={styles.formTitle}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>

          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor={colors.textTertiary}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={loading || !username.trim() || !password}
            style={({ pressed }) => [
              styles.submitButton,
              (loading || !username.trim() || !password) && styles.submitButtonDisabled,
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#0A0A0A" />
            ) : (
              <Text style={styles.submitText}>{isLogin ? 'Sign In' : 'Sign Up'}</Text>
            )}
          </Pressable>

          <Pressable onPress={() => { setIsLogin(!isLogin); setError(''); }} style={styles.switchButton}>
            <Text style={styles.switchText}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <Text style={styles.switchHighlight}>{isLogin ? 'Sign Up' : 'Sign In'}</Text>
            </Text>
          </Pressable>
        </Animated.View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#1A1816',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2E2A24',
  },
  logoN: {
    fontSize: 40,
    fontFamily: 'Inter_700Bold',
    color: colors.cream,
    letterSpacing: -2,
  },
  logoText: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: colors.cream,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  tagline: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.warmGrey,
    marginTop: 6,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  formTitle: {
    fontSize: 22,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.error,
    flex: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    height: 50,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: colors.text,
    height: '100%',
  },
  eyeButton: {
    padding: 4,
  },
  submitButton: {
    backgroundColor: colors.cream,
    borderRadius: 12,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#0A0A0A',
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
  switchHighlight: {
    color: colors.accent,
    fontFamily: 'Inter_600SemiBold',
  },
});
