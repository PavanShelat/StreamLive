// src/components/ChatBox.tsx
// Real-time chat UI — shows messages, handles sending, shows offline status

import { useRef, useState } from 'react'
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native'
import { ChatMessage } from '@/hooks/useChat'
import { useAuth } from '@/context/AuthContext'
import { Colors } from '@/constants/Colors'

interface ChatBoxProps {
  messages: ChatMessage[]
  onSend: (body: string) => Promise<void>
  isOnline: boolean
  syncing: boolean
}

function MessageBubble({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  return (
    <View style={[styles.messagRow, isOwn && styles.messageRowOwn]}>
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        {!isOwn && (
          <Text style={styles.senderName}>{message.sender_username}</Text>
        )}
        <Text style={styles.messageBody}>{message.body}</Text>
      </View>
    </View>
  )
}

export function ChatBox({ messages, onSend, isOnline, syncing }: ChatBoxProps) {
  const { user } = useAuth()
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<FlatList>(null)

  const handleSend = async () => {
    if (!input.trim() || sending) return
    setSending(true)
    await onSend(input.trim())
    setInput('')
    setSending(false)
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      {/* Offline / Syncing banner */}
      {(!isOnline || syncing) && (
        <View style={[styles.banner, syncing ? styles.bannerSyncing : styles.bannerOffline]}>
          {syncing
            ? <><ActivityIndicator color="#fff" size="small" /><Text style={styles.bannerText}>  Syncing messages…</Text></>
            : <Text style={styles.bannerText}>📵 Offline — messages will sync when reconnected</Text>
          }
        </View>
      )}

      {/* Message list */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <MessageBubble message={item} isOwn={item.sender_id === user?.id} />
        )}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Input row */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={isOnline ? 'Send a message…' : 'Type to queue (offline)…'}
          placeholderTextColor={Colors.brand.textMuted}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          multiline={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || sending}
          activeOpacity={0.8}
        >
          {sending
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.sendIcon}>↑</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 10,
    marginBottom: 6,
  },
  bannerOffline: { backgroundColor: Colors.brand.warning + 'CC' },
  bannerSyncing: { backgroundColor: Colors.brand.secondary + 'CC' },
  bannerText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  listContent: { paddingHorizontal: 10, paddingVertical: 8, flexGrow: 1, justifyContent: 'flex-end' },
  messagRow: { marginVertical: 3, alignItems: 'flex-start' },
  messageRowOwn: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: '80%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleOther: { backgroundColor: Colors.brand.surface },
  bubbleOwn: { backgroundColor: Colors.brand.primary },
  senderName: {
    color: Colors.brand.secondary,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  messageBody: { color: Colors.brand.textPrimary, fontSize: 14 },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.brand.border,
    backgroundColor: Colors.brand.bg,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.brand.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.brand.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.brand.border,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.brand.surfaceHigh },
  sendIcon: { color: '#fff', fontSize: 18, fontWeight: '700' },
})
