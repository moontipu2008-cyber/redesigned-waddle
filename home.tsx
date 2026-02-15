import React, { useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useChat, Conversation } from '@/context/ChatContext';
import { Ionicons, Feather } from '@expo/vector-icons';
import colors from '@/constants/colors';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

function ConversationItem({ item, index, onDelete }: { item: Conversation; index: number; onDelete: (id: string) => void }) {
  const lastMessage = item.messages[item.messages.length - 1];
  const preview = lastMessage ? lastMessage.content.slice(0, 80) : 'No messages yet';
  const timeAgo = getTimeAgo(item.updatedAt);

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(index * 50)}>
      <Pressable
        onPress={() => router.push({ pathname: '/chat/[id]', params: { id: item.id } })}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onDelete(item.id);
        }}
        style={({ pressed }) => [styles.chatItem, pressed && { backgroundColor: colors.surfaceHover }]}
      >
        <View style={styles.chatIcon}>
          <Ionicons name="chatbubble" size={18} color={colors.cream} />
        </View>
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.chatTime}>{timeAgo}</Text>
          </View>
          <Text style={styles.chatPreview} numberOfLines={1}>{preview}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function getTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { conversations, createConversation, deleteConversation } = useChat();

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  async function handleNewChat() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const id = await createConversation();
    router.push({ pathname: '/chat/[id]', params: { id } });
  }

  function handleImageGen() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/image');
  }

  const handleDelete = useCallback((id: string) => {
    if (Platform.OS === 'web') {
      if (confirm('Delete this conversation?')) {
        deleteConversation(id);
      }
    } else {
      Alert.alert('Delete Chat', 'Are you sure you want to delete this conversation?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteConversation(id) },
      ]);
    }
  }, [deleteConversation]);

  async function handleLogout() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await logout();
    router.replace('/');
  }

  const renderItem = useCallback(({ item, index }: { item: Conversation; index: number }) => (
    <ConversationItem item={item} index={index} onDelete={handleDelete} />
  ), [handleDelete]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.miniLogo}>
            <Text style={styles.miniLogoN}>N</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Nexus</Text>
            <Text style={styles.headerSubtitle}>{user?.username}</Text>
          </View>
        </View>
        <Pressable onPress={handleLogout} hitSlop={12}>
          <Feather name="log-out" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          onPress={handleNewChat}
          style={({ pressed }) => [styles.actionButton, styles.actionPrimary, pressed && { opacity: 0.9 }]}
        >
          <Ionicons name="add" size={20} color="#0A0A0A" />
          <Text style={styles.actionTextPrimary}>New Chat</Text>
        </Pressable>
        <Pressable
          onPress={handleImageGen}
          style={({ pressed }) => [styles.actionButton, styles.actionSecondary, pressed && { opacity: 0.9 }]}
        >
          <Ionicons name="image-outline" size={20} color={colors.cream} />
          <Text style={styles.actionTextSecondary}>Generate Image</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Recent Chats</Text>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + webBottomInset + 20 },
          conversations.length === 0 && styles.emptyList,
        ]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySubtitle}>Start a new chat to begin</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
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
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  miniLogo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1A1816',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2E2A24',
  },
  miniLogoN: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: colors.cream,
    letterSpacing: -1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 12,
  },
  actionPrimary: {
    backgroundColor: colors.cream,
  },
  actionSecondary: {
    backgroundColor: colors.accentMuted,
    borderWidth: 1,
    borderColor: 'rgba(200, 189, 168, 0.25)',
  },
  actionTextPrimary: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#0A0A0A',
  },
  actionTextSecondary: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.cream,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  emptyList: {
    flex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chatIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(200, 189, 168, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  chatTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  chatTime: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: colors.textTertiary,
  },
  chatPreview: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textSecondary,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textTertiary,
  },
});
