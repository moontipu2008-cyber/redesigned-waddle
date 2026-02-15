import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import colors from '@/constants/colors';
import { getApiUrl } from '@/lib/query-client';
import * as Haptics from 'expo-haptics';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

export default function ImageScreen() {
  const insets = useSafeAreaInsets();
  const [prompt, setPrompt] = useState('');
  const [imageData, setImageData] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  async function handleGenerate() {
    const text = prompt.trim();
    if (!text || isGenerating) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsGenerating(true);
    setError('');
    setImageData(null);

    try {
      const baseUrl = getApiUrl();
      const response = await globalThis.fetch(`${baseUrl}api/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate image');
      }

      const data = await response.json();
      if (data.b64_json) {
        setImageData(data.b64_json);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error('No image data received');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to generate image. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Image Generator</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + webBottomInset + 20 }]}
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          {imageData ? (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: `data:image/png;base64,${imageData}` }}
                style={styles.generatedImage}
                contentFit="contain"
                transition={300}
              />
            </View>
          ) : (
            <View style={styles.placeholderContainer}>
              {isGenerating ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.accent} />
                  <Text style={styles.loadingText}>Creating your image...</Text>
                  <Text style={styles.loadingSubtext}>This may take a moment</Text>
                </View>
              ) : (
                <>
                  <Ionicons name="image-outline" size={56} color={colors.textTertiary} />
                  <Text style={styles.placeholderTitle}>Generate any image</Text>
                  <Text style={styles.placeholderSub}>
                    Describe what you want to see - even a single word works
                  </Text>
                </>
              )}
            </View>
          )}

          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.quickPrompts}>
            <Text style={styles.quickLabel}>Quick ideas:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {['Moon', 'Forest', 'Ocean sunset', 'Mountain', 'City at night', 'Cat', 'Dragon', 'Galaxy'].map(chip => (
                <Pressable
                  key={chip}
                  onPress={() => { setPrompt(chip); }}
                  style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.chipText}>{chip}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </ScrollView>

        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, webBottomInset) + 8 }]}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="Describe your image..."
              placeholderTextColor={colors.textTertiary}
              value={prompt}
              onChangeText={setPrompt}
              multiline
              maxLength={1000}
            />
            <Pressable
              onPress={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              style={({ pressed }) => [
                styles.generateButton,
                (!prompt.trim() || isGenerating) && styles.generateButtonDisabled,
                pressed && { opacity: 0.8 },
              ]}
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color="#0A0A0A" />
              ) : (
                <Ionicons name="sparkles" size={18} color="#0A0A0A" />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 60,
  },
  placeholderTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    marginTop: 8,
  },
  placeholderSub: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  loadingSubtext: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  generatedImage: {
    width: '100%',
    height: '100%',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 16,
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.error,
    flex: 1,
  },
  quickPrompts: {
    marginTop: 20,
  },
  quickLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 20,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1A1816',
    borderWidth: 1,
    borderColor: '#2E2A24',
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: colors.text,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    backgroundColor: colors.inputBg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 44,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: colors.text,
    maxHeight: 80,
    paddingTop: Platform.OS === 'ios' ? 6 : 4,
    paddingBottom: Platform.OS === 'ios' ? 6 : 4,
  },
  generateButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
  },
  generateButtonDisabled: {
    backgroundColor: colors.surface,
  },
});
