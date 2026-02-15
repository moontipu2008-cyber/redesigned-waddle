import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useChat, Message, generateMessageId } from '@/context/ChatContext';
import { Ionicons } from '@expo/vector-icons';
import colors from '@/constants/colors';
import { fetch } from 'expo/fetch';
import { getApiUrl } from '@/lib/query-client';
import * as Haptics from 'expo-haptics';

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      {!isUser && (
        <View style={styles.avatarSmall}>
          <Text style={styles.avatarText}>N</Text>
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        <Text style={[styles.bubbleText, isUser && styles.userBubbleText]}>{message.content}</Text>
      </View>
    </View>
  );
}

function TypingIndicator() {
  return (
    <View style={[styles.bubbleRow]}>
      <View style={styles.avatarSmall}>
        <Text style={styles.avatarText}>N</Text>
      </View>
      <View style={[styles.bubble, styles.assistantBubble, styles.typingBubble]}>
        <View style={styles.typingDots}>
          <View style={[styles.dot, styles.dot1]} />
          <View style={[styles.dot, styles.dot2]} />
          <View style={[styles.dot, styles.dot3]} />
        </View>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { getConversation, addMessage, updateLastMessage, updateConversationTitle } = useChat();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const initializedRef = useRef(false);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  useEffect(() => {
    if (!initializedRef.current && id) {
      const conv = getConversation(id);
      if (conv && conv.messages.length > 0) {
        setMessages(conv.messages);
      }
      initializedRef.current = true;
    }
  }, [id]);

  async function handleSend() {
    const text = inputText.trim();
    if (!text || isStreaming) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputText('');

    const currentMessages = [...messages];
    const userMessage: Message = {
      id: generateMessageId(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const newMessages = [...currentMessages, userMessage];
    setMessages(newMessages);
    await addMessage(id, userMessage);

    setIsStreaming(true);
    setShowTyping(true);

    let fullContent = '';
    let assistantAdded = false;

    try {
      const baseUrl = getApiUrl();
      const chatHistory = newMessages.map(m => ({ role: m.role, content: m.content }));

      const response = await fetch(`${baseUrl}api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({ messages: chatHistory }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullContent += parsed.content;

              if (!assistantAdded) {
                setShowTyping(false);
                const assistantMsg: Message = {
                  id: generateMessageId(),
                  role: 'assistant',
                  content: fullContent,
                  timestamp: Date.now(),
                };
                setMessages(prev => [...prev, assistantMsg]);
                assistantAdded = true;
              } else {
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: fullContent,
                  };
                  return updated;
                });
              }
            }
            if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }

      if (fullContent) {
        const assistantFinal: Message = {
          id: generateMessageId(),
          role: 'assistant',
          content: fullContent,
          timestamp: Date.now(),
        };
        await addMessage(id, assistantFinal);

        if (currentMessages.length === 0) {
          const title = text.length > 30 ? text.slice(0, 30) + '...' : text;
          await updateConversationTitle(id, title);
        }
      }
    } catch (error) {
      setShowTyping(false);
      const errorMsg: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: Date.now(),
      };
      if (!assistantAdded) {
        setMessages(prev => [...prev, errorMsg]);
      }
      await addMessage(id, errorMsg);
    } finally {
      setIsStreaming(false);
      setShowTyping(false);
    }
  }

  const reversedMessages = [...messages].reverse();

  const renderItem = useCallback(({ item }: { item: Message }) => (
    <MessageBubble message={item} />
  ), []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={styles.headerLogo}>
            <Text style={styles.headerLogoN}>N</Text>
          </View>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {getConversation(id)?.title || 'Chat'}
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <FlatList
          data={reversedMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          inverted={messages.length > 0}
          ListHeaderComponent={showTyping ? <TypingIndicator /> : null}
          contentContainerStyle={[
            styles.messageList,
            messages.length === 0 && styles.emptyMessageList,
          ]}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <View style={styles.emptyChatLogo}>
                <Text style={styles.emptyChatN}>N</Text>
              </View>
              <Text style={styles.emptyChatTitle}>Start a conversation</Text>
              <Text style={styles.emptyChatSub}>Ask me anything - coding, math, science, creative writing, or any language</Text>
            </View>
          }
        />

        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, webBottomInset) + 8 }]}>
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="Message Nexus..."
              placeholderTextColor={colors.textTertiary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={4000}
              blurOnSubmit={false}
              onSubmitEditing={handleSend}
            />
            <Pressable
              onPress={() => {
                handleSend();
                inputRef.current?.focus();
              }}
              disabled={!inputText.trim() || isStreaming}
              style={({ pressed }) => [
                styles.sendButton,
                (!inputText.trim() || isStreaming) && styles.sendButtonDisabled,
                pressed && { opacity: 0.8 },
              ]}
            >
              {isStreaming ? (
                <ActivityIndicator size="small" color="#0A0A0A" />
              ) : (
                <Ionicons name="arrow-up" size={18} color="#0A0A0A" />
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
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  headerLogo: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#1A1816',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2E2A24',
  },
  headerLogoN: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: colors.cream,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    maxWidth: 200,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  emptyMessageList: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyChat: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 40,
  },
  emptyChatLogo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#1A1816',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2E2A24',
  },
  emptyChatN: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    color: colors.cream,
  },
  emptyChatTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
  },
  emptyChatSub: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'flex-end',
    gap: 8,
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  avatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#1A1816',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2E2A24',
  },
  avatarText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: colors.cream,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#2C2820',
    borderBottomRightRadius: 4,
    borderWidth: 1,
    borderColor: '#3A3428',
  },
  assistantBubble: {
    backgroundColor: colors.assistantBubble,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: colors.text,
    lineHeight: 22,
  },
  userBubbleText: {
    color: '#FFFFFF',
  },
  typingBubble: {
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.textSecondary,
  },
  dot1: { opacity: 0.4 },
  dot2: { opacity: 0.6 },
  dot3: { opacity: 0.8 },
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
    maxHeight: 100,
    paddingTop: Platform.OS === 'ios' ? 6 : 4,
    paddingBottom: Platform.OS === 'ios' ? 6 : 4,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.surface,
  },
});
