import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Send } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import {
  getConversationMessages,
  markConversationRead,
  sendMessage,
} from "@/services/tryit-service";
import type { MessageItem } from "@/types/models";
import { timeAgo } from "@/utils/format";

export default function ChatScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const conversationId = String(id ?? "");
  const { userId } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList<MessageItem>>(null);
  const [text, setText] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);
  const sendingRef = useRef<boolean>(false);

  const messagesQuery = useQuery<MessageItem[]>({
    queryKey: ["messages", conversationId],
    queryFn: () => getConversationMessages(conversationId),
    enabled: conversationId.length > 0,
  });

  // Mark as read on open, subscribe to realtime inserts
  useEffect(() => {
    if (conversationId.length === 0) return;
    markConversationRead(conversationId).catch(() => {});

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  const handleSend = useCallback(async () => {
    const content = text.trim();
    if (content.length === 0 || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setText("");

    // Optimistic: append message to cache immediately
    const optimisticMsg: MessageItem = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: userId ?? "",
      content,
      message_type: "text",
      media_url: null,
      created_at: new Date().toISOString(),
    };
    queryClient.setQueryData<MessageItem[]>(["messages", conversationId], (old) => [
      ...(old ?? []),
      optimisticMsg,
    ]);

    try {
      await sendMessage(conversationId, content);
      // Refetch to get the real message with server ID + correct timestamp
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations", userId] });
    } catch (e) {
      console.log("[chat] send failed", e);
      // Rollback: remove the optimistic message and restore text
      queryClient.setQueryData<MessageItem[]>(["messages", conversationId], (old) =>
        (old ?? []).filter((m) => m.id !== optimisticMsg.id),
      );
      setText(content);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }, [text, conversationId, queryClient, userId]);

  const messages = messagesQuery.data ?? [];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <Stack.Screen options={{ title: name ? String(name) : "Chat" }} />
      {messagesQuery.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.flameOrange} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const mine = item.sender_id === userId;
            return (
              <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <Text style={styles.bubbleText}>{item.content}</Text>
                  <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>
                    {timeAgo(item.created_at)}
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>👋</Text>
              <Text style={styles.emptyText}>Say hi and start the conversation</Text>
            </View>
          }
        />
      )}

      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TextInput
          testID="chat-input"
          style={styles.input}
          placeholder="Message..."
          placeholderTextColor={Colors.inactiveIcon}
          value={text}
          onChangeText={setText}
          multiline
        />
        <TouchableOpacity
          testID="chat-send"
          style={[styles.sendButton, (sending || text.trim().length === 0) && styles.sendDisabled]}
          onPress={handleSend}
          disabled={sending || text.trim().length === 0}
        >
          {sending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Send size={18} color="#FFFFFF" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  bubbleRow: {
    flexDirection: "row",
  },
  bubbleRowMine: {
    justifyContent: "flex-end",
  },
  bubbleRowTheirs: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  bubbleMine: {
    backgroundColor: Colors.flameOrange,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: Colors.surfaceVariant,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 19,
  },
  bubbleTime: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 10,
    marginTop: 3,
    alignSelf: "flex-end",
  },
  bubbleTimeMine: {
    color: "rgba(255,255,255,0.7)",
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 36,
  },
  emptyText: {
    color: Colors.mutedText,
    fontSize: 14,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.softGray,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 14,
    maxHeight: 110,
  },
  sendButton: {
    backgroundColor: Colors.flameOrange,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: {
    opacity: 0.5,
  },
});
