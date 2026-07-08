import { useRouter } from "expo-router";
import { MessageSquare, Trash2 } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import Avatar from "@/components/Avatar";
import Colors from "@/constants/colors";
import type { CommentItem } from "@/types/models";
import { timeAgo } from "@/utils/format";

interface CommentNode {
  comment: CommentItem;
  replies: CommentNode[];
}

interface CommentThreadProps {
  nodes: CommentNode[];
  currentUserId: string | null;
  onReply: (parentId: string) => void;
  onDelete: (commentId: string) => void;
  depth?: number;
}

/** Flatten comments into a parent → children tree. */
export function buildCommentTree(comments: CommentItem[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];
  comments.forEach((c) => map.set(c.id, { comment: c, replies: [] }));
  comments.forEach((c) => {
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.replies.push(map.get(c.id)!);
    } else {
      roots.push(map.get(c.id)!);
    }
  });
  return roots;
}

export default function CommentThread({ nodes, currentUserId, onReply, onDelete, depth = 0 }: CommentThreadProps) {
  return (
    <View>
      {nodes.map((node) => (
        <CommentRow
          key={node.comment.id}
          node={node}
          currentUserId={currentUserId}
          onReply={onReply}
          onDelete={onDelete}
          depth={depth}
        />
      ))}
    </View>
  );
}

function CommentRow({
  node,
  currentUserId,
  onReply,
  onDelete,
  depth,
}: {
  node: CommentNode;
  currentUserId: string | null;
  onReply: (parentId: string) => void;
  onDelete: (commentId: string) => void;
  depth: number;
}) {
  const router = useRouter();
  const [showReplies, setShowReplies] = useState<boolean>(true);
  const comment = node.comment;
  const isOwn = currentUserId === comment.user_id;

  const openProfile = useCallback(() => {
    router.push({ pathname: "/user/[id]", params: { id: comment.user_id } });
  }, [router, comment.user_id]);

  const toggleReplies = useCallback(() => setShowReplies((s) => !s), []);

  return (
    <View style={[styles.row, { paddingLeft: 16 + depth * 24 }]}>
      <TouchableOpacity onPress={openProfile}>
        <Avatar uri={comment.author?.avatar_url} name={comment.author?.display_name} size={32} />
      </TouchableOpacity>
      <View style={styles.body}>
        <View style={styles.meta}>
          <TouchableOpacity onPress={openProfile}>
            <Text style={styles.author} numberOfLines={1}>
              {comment.author?.display_name ?? "User"}
            </Text>
          </TouchableOpacity>
          <Text style={styles.time}>{timeAgo(comment.created_at)}</Text>
        </View>
        <Text style={styles.text}>{comment.content}</Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.replyBtn} onPress={() => onReply(comment.id)} testID={`reply-button-${comment.id}`}>
            <MessageSquare size={13} color={Colors.mutedText} />
            <Text style={styles.replyText}>Reply</Text>
          </TouchableOpacity>
          {isOwn ? (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => onDelete(comment.id)}
              testID={`delete-comment-${comment.id}`}
            >
              <Trash2 size={13} color={Colors.error} />
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {node.replies.length > 0 ? (
          <View>
            <TouchableOpacity onPress={toggleReplies} style={styles.toggleReplies}>
              <Text style={styles.toggleText}>
                {showReplies ? "Hide" : "View"} {node.replies.length} {node.replies.length === 1 ? "reply" : "replies"}
              </Text>
            </TouchableOpacity>
            {showReplies ? (
              <CommentThread
                nodes={node.replies}
                currentUserId={currentUserId}
                onReply={onReply}
                onDelete={onDelete}
                depth={depth + 1}
              />
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 8,
    paddingRight: 16,
  },
  body: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  author: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: "700" as const,
  },
  time: {
    color: Colors.mutedText,
    fontSize: 11,
  },
  text: {
    color: "#DDDDDD",
    fontSize: 14,
    lineHeight: 19,
  },
  actions: {
    flexDirection: "row",
    gap: 16,
    marginTop: 6,
  },
  replyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  replyText: {
    color: Colors.mutedText,
    fontSize: 12,
    fontWeight: "600" as const,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  deleteText: {
    color: Colors.error,
    fontSize: 12,
    fontWeight: "600" as const,
  },
  toggleReplies: {
    marginTop: 6,
  },
  toggleText: {
    color: Colors.neonBlue,
    fontSize: 12,
    fontWeight: "600" as const,
  },
});
