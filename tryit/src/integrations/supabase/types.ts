/* eslint-disable */
// AUTO-GENERATED — DO NOT EDIT
// Run migrations to regenerate.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          admin_level: string
          created_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          user_id: string
        }
        Insert: {
          admin_level?: string
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          user_id: string
        }
        Update: {
          admin_level?: string
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          actor_id: string | null
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          post_id: string | null
          user_id: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          post_id?: string | null
          user_id?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          post_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      appeals: {
        Row: {
          admin_response: string | null
          appeal_reason: string
          appeal_status: Database["public"]["Enums"]["appeal_status"] | null
          created_at: string | null
          id: string
          moderation_action_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          appeal_reason: string
          appeal_status?: Database["public"]["Enums"]["appeal_status"] | null
          created_at?: string | null
          id?: string
          moderation_action_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_response?: string | null
          appeal_reason?: string
          appeal_status?: Database["public"]["Enums"]["appeal_status"] | null
          created_at?: string | null
          id?: string
          moderation_action_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appeals_moderation_action_id_fkey"
            columns: ["moderation_action_id"]
            isOneToOne: false
            referencedRelation: "moderation_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appeals_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appeals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      banned_words: {
        Row: {
          added_by: string | null
          category: string
          created_at: string | null
          id: string
          is_active: boolean | null
          severity: string
          word: string
        }
        Insert: {
          added_by?: string | null
          category?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          severity?: string
          word: string
        }
        Update: {
          added_by?: string | null
          category?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          severity?: string
          word?: string
        }
        Relationships: [
          {
            foreignKeyName: "banned_words_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_users_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profiles: {
        Row: {
          business_name: string
          business_type: string | null
          created_at: string | null
          description: string | null
          id: string
          industry: string | null
          logo_url: string | null
          subscription_tier: string | null
          total_budget_spent: number | null
          updated_at: string | null
          user_id: string
          verified: boolean | null
          website: string | null
        }
        Insert: {
          business_name: string
          business_type?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          subscription_tier?: string | null
          total_budget_spent?: number | null
          updated_at?: string | null
          user_id: string
          verified?: boolean | null
          website?: string | null
        }
        Update: {
          business_name?: string
          business_type?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          subscription_tier?: string | null
          total_budget_spent?: number | null
          updated_at?: string | null
          user_id?: string
          verified?: boolean | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_analytics: {
        Row: {
          applications: number | null
          campaign_id: string
          completions: number | null
          conversion_rate: number | null
          date: string
          engagement_rate: number | null
          id: string
          participants: number | null
          reach: number | null
          roi: number | null
          views: number | null
          viral_growth: number | null
        }
        Insert: {
          applications?: number | null
          campaign_id: string
          completions?: number | null
          conversion_rate?: number | null
          date?: string
          engagement_rate?: number | null
          id?: string
          participants?: number | null
          reach?: number | null
          roi?: number | null
          views?: number | null
          viral_growth?: number | null
        }
        Update: {
          applications?: number | null
          campaign_id?: string
          completions?: number | null
          conversion_rate?: number | null
          date?: string
          engagement_rate?: number | null
          id?: string
          participants?: number | null
          reach?: number | null
          roi?: number | null
          views?: number | null
          viral_growth?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_analytics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_applications: {
        Row: {
          applicant_id: string
          campaign_id: string
          created_at: string | null
          id: string
          invited_by_brand: boolean | null
          pitch: string | null
          portfolio_urls: Json | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["application_status"] | null
          updated_at: string | null
        }
        Insert: {
          applicant_id: string
          campaign_id: string
          created_at?: string | null
          id?: string
          invited_by_brand?: boolean | null
          pitch?: string | null
          portfolio_urls?: Json | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          updated_at?: string | null
        }
        Update: {
          applicant_id?: string
          campaign_id?: string
          created_at?: string | null
          id?: string
          invited_by_brand?: boolean | null
          pitch?: string | null
          portfolio_urls?: Json | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_applications_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_leaderboards: {
        Row: {
          badges_earned: string[] | null
          campaign_id: string
          id: string
          last_activity: string | null
          rank: number | null
          score: number | null
          streak_days: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          badges_earned?: string[] | null
          campaign_id: string
          id?: string
          last_activity?: string | null
          rank?: number | null
          score?: number | null
          streak_days?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          badges_earned?: string[] | null
          campaign_id?: string
          id?: string
          last_activity?: string | null
          rank?: number | null
          score?: number | null
          streak_days?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_leaderboards_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_leaderboards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_metrics: {
        Row: {
          campaign_id: string | null
          conversion_rate: number | null
          id: string
          joined_count: number | null
          owner_id: string | null
          tried_count: number | null
          updated_at: string | null
          view_count: number | null
          viral_score: number | null
        }
        Insert: {
          campaign_id?: string | null
          conversion_rate?: number | null
          id?: string
          joined_count?: number | null
          owner_id?: string | null
          tried_count?: number | null
          updated_at?: string | null
          view_count?: number | null
          viral_score?: number | null
        }
        Update: {
          campaign_id?: string | null
          conversion_rate?: number | null
          id?: string
          joined_count?: number | null
          owner_id?: string | null
          tried_count?: number | null
          updated_at?: string | null
          view_count?: number | null
          viral_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_metrics_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_participants: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_participants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_rewards: {
        Row: {
          badge_icon: string | null
          badge_name: string | null
          campaign_id: string
          created_at: string | null
          id: string
          rank_position: number
          reward_amount: number | null
          reward_description: string | null
          reward_type: Database["public"]["Enums"]["reward_type"] | null
        }
        Insert: {
          badge_icon?: string | null
          badge_name?: string | null
          campaign_id: string
          created_at?: string | null
          id?: string
          rank_position: number
          reward_amount?: number | null
          reward_description?: string | null
          reward_type?: Database["public"]["Enums"]["reward_type"] | null
        }
        Update: {
          badge_icon?: string | null
          badge_name?: string | null
          campaign_id?: string
          created_at?: string | null
          id?: string
          rank_position?: number
          reward_amount?: number | null
          reward_description?: string | null
          reward_type?: Database["public"]["Enums"]["reward_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_rewards_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          applications_count: number | null
          boost_expires_at: string | null
          brand_id: string
          budget: number | null
          budget_spent: number | null
          campaign_type: Database["public"]["Enums"]["campaign_type"]
          category: string | null
          completions_count: number | null
          cover_image_url: string | null
          created_at: string | null
          creator_id: string | null
          current_participants: number | null
          description: string
          end_date: string | null
          goals: string | null
          id: string
          is_boosted: boolean | null
          is_featured: boolean | null
          is_remote: boolean | null
          latitude: number | null
          location: string | null
          longitude: number | null
          max_participants: number | null
          media_urls: Json | null
          min_followers: number | null
          requirements: string | null
          requires_verification: boolean | null
          reward_amount: number | null
          reward_description: string | null
          reward_type: Database["public"]["Enums"]["reward_type"] | null
          start_date: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          tags: string[] | null
          title: string
          updated_at: string | null
          views: number | null
          viral_score: number | null
        }
        Insert: {
          applications_count?: number | null
          boost_expires_at?: string | null
          brand_id: string
          budget?: number | null
          budget_spent?: number | null
          campaign_type?: Database["public"]["Enums"]["campaign_type"]
          category?: string | null
          completions_count?: number | null
          cover_image_url?: string | null
          created_at?: string | null
          creator_id?: string | null
          current_participants?: number | null
          description: string
          end_date?: string | null
          goals?: string | null
          id?: string
          is_boosted?: boolean | null
          is_featured?: boolean | null
          is_remote?: boolean | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          max_participants?: number | null
          media_urls?: Json | null
          min_followers?: number | null
          requirements?: string | null
          requires_verification?: boolean | null
          reward_amount?: number | null
          reward_description?: string | null
          reward_type?: Database["public"]["Enums"]["reward_type"] | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          tags?: string[] | null
          title: string
          updated_at?: string | null
          views?: number | null
          viral_score?: number | null
        }
        Update: {
          applications_count?: number | null
          boost_expires_at?: string | null
          brand_id?: string
          budget?: number | null
          budget_spent?: number | null
          campaign_type?: Database["public"]["Enums"]["campaign_type"]
          category?: string | null
          completions_count?: number | null
          cover_image_url?: string | null
          created_at?: string | null
          creator_id?: string | null
          current_participants?: number | null
          description?: string
          end_date?: string | null
          goals?: string | null
          id?: string
          is_boosted?: boolean | null
          is_featured?: boolean | null
          is_remote?: boolean | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          max_participants?: number | null
          media_urls?: Json | null
          min_followers?: number | null
          requirements?: string | null
          requires_verification?: boolean | null
          reward_amount?: number | null
          reward_description?: string | null
          reward_type?: Database["public"]["Enums"]["reward_type"] | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          views?: number | null
          viral_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_invites: {
        Row: {
          created_at: string | null
          id: string
          invited_by: string
          invited_user_id: string
          post_id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          invited_by: string
          invited_user_id: string
          post_id: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_by?: string
          invited_user_id?: string
          post_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_invites_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_invites_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          guest_id: string | null
          id: string
          like_count: number | null
          parent_id: string | null
          post_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          guest_id?: string | null
          id?: string
          like_count?: number | null
          parent_id?: string | null
          post_id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          guest_id?: string | null
          id?: string
          like_count?: number | null
          parent_id?: string | null
          post_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_flags: {
        Row: {
          auto_flagged: boolean | null
          content_id: string
          content_type: Database["public"]["Enums"]["report_content_type"]
          created_at: string | null
          flag_details: Json | null
          flag_type: string
          id: string
          is_resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          auto_flagged?: boolean | null
          content_id: string
          content_type: Database["public"]["Enums"]["report_content_type"]
          created_at?: string | null
          flag_details?: Json | null
          flag_type: string
          id?: string
          is_resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          auto_flagged?: boolean | null
          content_id?: string
          content_type?: Database["public"]["Enums"]["report_content_type"]
          created_at?: string | null
          flag_details?: Json | null
          flag_type?: string
          id?: string
          is_resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_flags_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          is_archived: boolean | null
          is_muted: boolean | null
          is_pinned: boolean | null
          joined_at: string | null
          last_read_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_archived?: boolean | null
          is_muted?: boolean | null
          is_pinned?: boolean | null
          joined_at?: string | null
          last_read_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_archived?: boolean | null
          is_muted?: boolean | null
          is_pinned?: boolean | null
          joined_at?: string | null
          last_read_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          conversation_type: string | null
          created_at: string | null
          created_by: string | null
          group_avatar_url: string | null
          group_name: string | null
          id: string
          is_group: boolean | null
          last_message_at: string | null
          last_message_sender_id: string | null
          last_message_text: string | null
          updated_at: string | null
        }
        Insert: {
          conversation_type?: string | null
          created_at?: string | null
          created_by?: string | null
          group_avatar_url?: string | null
          group_name?: string | null
          id?: string
          is_group?: boolean | null
          last_message_at?: string | null
          last_message_sender_id?: string | null
          last_message_text?: string | null
          updated_at?: string | null
        }
        Update: {
          conversation_type?: string | null
          created_at?: string | null
          created_by?: string | null
          group_avatar_url?: string | null
          group_name?: string | null
          id?: string
          is_group?: boolean | null
          last_message_at?: string | null
          last_message_sender_id?: string | null
          last_message_text?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_last_message_sender_id_fkey"
            columns: ["last_message_sender_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_payouts: {
        Row: {
          amount: number
          campaign_id: string | null
          created_at: string | null
          creator_id: string
          id: string
          notes: string | null
          payout_method: string | null
          payout_reference: string | null
          processed_at: string | null
          status: Database["public"]["Enums"]["payout_status"] | null
        }
        Insert: {
          amount: number
          campaign_id?: string | null
          created_at?: string | null
          creator_id: string
          id?: string
          notes?: string | null
          payout_method?: string | null
          payout_reference?: string | null
          processed_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"] | null
        }
        Update: {
          amount?: number
          campaign_id?: string | null
          created_at?: string | null
          creator_id?: string
          id?: string
          notes?: string | null
          payout_method?: string | null
          payout_reference?: string | null
          processed_at?: string | null
          status?: Database["public"]["Enums"]["payout_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_payouts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_payouts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_quality_scores: {
        Row: {
          avg_completion_rate: number | null
          creator_id: string | null
          diversity_score: number | null
          engagement_rate: number | null
          id: string
          quality_score: number | null
          spam_score: number | null
          total_posts: number | null
          updated_at: string | null
          viral_posts: number | null
        }
        Insert: {
          avg_completion_rate?: number | null
          creator_id?: string | null
          diversity_score?: number | null
          engagement_rate?: number | null
          id?: string
          quality_score?: number | null
          spam_score?: number | null
          total_posts?: number | null
          updated_at?: string | null
          viral_posts?: number | null
        }
        Update: {
          avg_completion_rate?: number | null
          creator_id?: string | null
          diversity_score?: number | null
          engagement_rate?: number | null
          id?: string
          quality_score?: number | null
          spam_score?: number | null
          total_posts?: number | null
          updated_at?: string | null
          viral_posts?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_quality_scores_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_rankings: {
        Row: {
          avg_engagement_rate: number | null
          badges: string[] | null
          id: string
          overall_rank: number | null
          reliability_score: number | null
          tier: string | null
          total_campaigns_completed: number | null
          total_earnings: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avg_engagement_rate?: number | null
          badges?: string[] | null
          id?: string
          overall_rank?: number | null
          reliability_score?: number | null
          tier?: string | null
          total_campaigns_completed?: number | null
          total_earnings?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avg_engagement_rate?: number | null
          badges?: string[] | null
          id?: string
          overall_rank?: number | null
          reliability_score?: number | null
          tier?: string | null
          total_campaigns_completed?: number | null
          total_earnings?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_rankings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      digest_send_log: {
        Row: {
          id: string
          sent_at: string | null
          status: string
          tries_count: number
          user_id: string
          week_start: string
        }
        Insert: {
          id?: string
          sent_at?: string | null
          status?: string
          tries_count?: number
          user_id: string
          week_start: string
        }
        Update: {
          id?: string
          sent_at?: string | null
          status?: string
          tries_count?: number
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "digest_send_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_tracking: {
        Row: {
          comments_received: number | null
          created_at: string | null
          followers_gained: number | null
          id: string
          owner_id: string | null
          period_date: string
          period_type: string
          post_views: number | null
          profile_views: number | null
          reactions_received: number | null
          saves_received: number | null
          shares_received: number | null
          tried_this_received: number | null
        }
        Insert: {
          comments_received?: number | null
          created_at?: string | null
          followers_gained?: number | null
          id?: string
          owner_id?: string | null
          period_date: string
          period_type?: string
          post_views?: number | null
          profile_views?: number | null
          reactions_received?: number | null
          saves_received?: number | null
          shares_received?: number | null
          tried_this_received?: number | null
        }
        Update: {
          comments_received?: number | null
          created_at?: string | null
          followers_gained?: number | null
          id?: string
          owner_id?: string | null
          period_date?: string
          period_type?: string
          post_views?: number | null
          profile_views?: number | null
          reactions_received?: number | null
          saves_received?: number | null
          shares_received?: number | null
          tried_this_received?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "engagement_tracking_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_weights: {
        Row: {
          description: string | null
          id: string
          updated_at: string | null
          weight_key: string
          weight_value: number
        }
        Insert: {
          description?: string | null
          id?: string
          updated_at?: string | null
          weight_key: string
          weight_value?: number
        }
        Update: {
          description?: string | null
          id?: string
          updated_at?: string | null
          weight_key?: string
          weight_value?: number
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          affected_screen: string | null
          app_version: string | null
          category: Database["public"]["Enums"]["error_category"]
          created_at: string
          device_info: Json | null
          id: string
          message: string
          platform: string | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["error_severity"]
          stack_trace: string | null
          user_id: string | null
        }
        Insert: {
          affected_screen?: string | null
          app_version?: string | null
          category?: Database["public"]["Enums"]["error_category"]
          created_at?: string
          device_info?: Json | null
          id?: string
          message: string
          platform?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["error_severity"]
          stack_trace?: string | null
          user_id?: string | null
        }
        Update: {
          affected_screen?: string | null
          app_version?: string | null
          category?: Database["public"]["Enums"]["error_category"]
          created_at?: string
          device_info?: Json | null
          id?: string
          message?: string
          platform?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["error_severity"]
          stack_trace?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_logs_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "error_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hidden_posts: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hidden_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hidden_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string | null
          id: string
          message_id: string
          reaction: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_id: string
          reaction: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message_id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reads: {
        Row: {
          id: string
          message_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_requests: {
        Row: {
          conversation_id: string
          created_at: string | null
          id: string
          recipient_id: string
          requester_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          id?: string
          recipient_id: string
          requester_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          id?: string
          recipient_id?: string
          requester_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_requests_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_requests_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string | null
          id: string
          is_deleted: boolean | null
          media_url: string | null
          message_type: Database["public"]["Enums"]["message_type"] | null
          reply_preview: string | null
          reply_to_id: string | null
          sender_id: string
          shared_post_data: Json | null
          shared_post_id: string | null
          updated_at: string | null
          voice_duration_seconds: number | null
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          media_url?: string | null
          message_type?: Database["public"]["Enums"]["message_type"] | null
          reply_preview?: string | null
          reply_to_id?: string | null
          sender_id: string
          shared_post_data?: Json | null
          shared_post_id?: string | null
          updated_at?: string | null
          voice_duration_seconds?: number | null
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          media_url?: string | null
          message_type?: Database["public"]["Enums"]["message_type"] | null
          reply_preview?: string | null
          reply_to_id?: string | null
          sender_id?: string
          shared_post_data?: Json | null
          shared_post_id?: string | null
          updated_at?: string | null
          voice_duration_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_actions: {
        Row: {
          action_type: Database["public"]["Enums"]["moderation_action_type"]
          admin_id: string
          content_id: string | null
          content_type:
            | Database["public"]["Enums"]["report_content_type"]
            | null
          created_at: string | null
          duration_hours: number | null
          expires_at: string | null
          id: string
          notes: string | null
          reason: string
          report_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action_type: Database["public"]["Enums"]["moderation_action_type"]
          admin_id: string
          content_id?: string | null
          content_type?:
            | Database["public"]["Enums"]["report_content_type"]
            | null
          created_at?: string | null
          duration_hours?: number | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          reason: string
          report_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action_type?: Database["public"]["Enums"]["moderation_action_type"]
          admin_id?: string
          content_id?: string | null
          content_type?:
            | Database["public"]["Enums"]["report_content_type"]
            | null
          created_at?: string | null
          duration_hours?: number | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          reason?: string
          report_id?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_actions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_actions_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      muted_users: {
        Row: {
          created_at: string | null
          id: string
          muted_id: string
          muter_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          muted_id: string
          muter_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          muted_id?: string
          muter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "muted_users_muted_id_fkey"
            columns: ["muted_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "muted_users_muter_id_fkey"
            columns: ["muter_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          post_id: string | null
          reference_id: string | null
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          post_id?: string | null
          reference_id?: string | null
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          notification_type?: Database["public"]["Enums"]["notification_type"]
          post_id?: string | null
          reference_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_status: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          guest_id: string | null
          id: string
          post_id: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          guest_id?: string | null
          id?: string
          post_id: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          guest_id?: string | null
          id?: string
          post_id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_views: {
        Row: {
          completed: boolean | null
          created_at: string | null
          id: string
          post_id: string | null
          viewer_id: string | null
          watch_time_seconds: number | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          post_id?: string | null
          viewer_id?: string | null
          watch_time_seconds?: number | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          post_id?: string | null
          viewer_id?: string | null
          watch_time_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          campaign_description: string | null
          caption: string | null
          categories: string[] | null
          category: string
          comment_count: number | null
          created_at: string | null
          id: string
          is_sponsored: boolean | null
          joined_count: number
          likes_count: number | null
          location: string | null
          maybe_count: number
          media_type: string | null
          media_url: string | null
          media_urls: string[] | null
          must_try_count: number
          not_for_me_count: number
          post_type: string
          share_count: number | null
          thumbnail_url: string | null
          title: string
          tried_count: number | null
          try_score: number
          try_score_count: number
          updated_at: string | null
          user_id: string
          will_try_count: number
          worth_it_count: number
        }
        Insert: {
          campaign_description?: string | null
          caption?: string | null
          categories?: string[] | null
          category: string
          comment_count?: number | null
          created_at?: string | null
          id?: string
          is_sponsored?: boolean | null
          joined_count?: number
          likes_count?: number | null
          location?: string | null
          maybe_count?: number
          media_type?: string | null
          media_url?: string | null
          media_urls?: string[] | null
          must_try_count?: number
          not_for_me_count?: number
          post_type?: string
          share_count?: number | null
          thumbnail_url?: string | null
          title: string
          tried_count?: number | null
          try_score?: number
          try_score_count?: number
          updated_at?: string | null
          user_id: string
          will_try_count?: number
          worth_it_count?: number
        }
        Update: {
          campaign_description?: string | null
          caption?: string | null
          categories?: string[] | null
          category?: string
          comment_count?: number | null
          created_at?: string | null
          id?: string
          is_sponsored?: boolean | null
          joined_count?: number
          likes_count?: number | null
          location?: string | null
          maybe_count?: number
          media_type?: string | null
          media_url?: string | null
          media_urls?: string[] | null
          must_try_count?: number
          not_for_me_count?: number
          post_type?: string
          share_count?: number | null
          thumbnail_url?: string | null
          title?: string
          tried_count?: number | null
          try_score?: number
          try_score_count?: number
          updated_at?: string | null
          user_id?: string
          will_try_count?: number
          worth_it_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_views: {
        Row: {
          created_at: string | null
          id: string
          profile_id: string | null
          viewer_id: string | null
          viewer_location: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          profile_id?: string | null
          viewer_id?: string | null
          viewer_location?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          profile_id?: string | null
          viewer_id?: string | null
          viewer_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_views_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          created_at: string | null
          id: string
          platform: string | null
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          platform?: string | null
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          platform?: string | null
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reactions: {
        Row: {
          created_at: string | null
          guest_id: string | null
          id: string
          post_id: string
          reaction_type: Database["public"]["Enums"]["reaction_type"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          guest_id?: string | null
          id?: string
          post_id: string
          reaction_type: Database["public"]["Enums"]["reaction_type"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          guest_id?: string | null
          id?: string
          post_id?: string
          reaction_type?: Database["public"]["Enums"]["reaction_type"]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recent_searches: {
        Row: {
          created_at: string | null
          id: string
          query: string
          search_type: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          query: string
          search_type?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          query?: string
          search_type?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recent_searches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_cache: {
        Row: {
          algorithm_version: string | null
          expires_at: string | null
          feed_type: string
          generated_at: string | null
          id: string
          post_ids: string[]
          user_id: string | null
        }
        Insert: {
          algorithm_version?: string | null
          expires_at?: string | null
          feed_type: string
          generated_at?: string | null
          id?: string
          post_ids?: string[]
          user_id?: string | null
        }
        Update: {
          algorithm_version?: string | null
          expires_at?: string | null
          feed_type?: string
          generated_at?: string | null
          id?: string
          post_ids?: string[]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          content_id: string
          content_type: Database["public"]["Enums"]["report_content_type"]
          created_at: string | null
          description: string | null
          id: string
          reason: Database["public"]["Enums"]["report_reason"]
          report_status: Database["public"]["Enums"]["report_status"] | null
          reported_user_id: string | null
          reporter_id: string
          resolution_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          updated_at: string | null
        }
        Insert: {
          content_id: string
          content_type: Database["public"]["Enums"]["report_content_type"]
          created_at?: string | null
          description?: string | null
          id?: string
          reason: Database["public"]["Enums"]["report_reason"]
          report_status?: Database["public"]["Enums"]["report_status"] | null
          reported_user_id?: string | null
          reporter_id: string
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string | null
        }
        Update: {
          content_id?: string
          content_type?: Database["public"]["Enums"]["report_content_type"]
          created_at?: string | null
          description?: string | null
          id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          report_status?: Database["public"]["Enums"]["report_status"] | null
          reported_user_id?: string | null
          reporter_id?: string
          resolution_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_settings: {
        Row: {
          allow_campaign_invites: boolean | null
          allow_comments:
            | Database["public"]["Enums"]["comment_permission"]
            | null
          allow_dms: Database["public"]["Enums"]["dm_permission"] | null
          allow_tagging: boolean | null
          created_at: string | null
          id: string
          private_profile: boolean | null
          restrict_sensitive_content: boolean | null
          safe_search: boolean | null
          show_activity_status: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allow_campaign_invites?: boolean | null
          allow_comments?:
            | Database["public"]["Enums"]["comment_permission"]
            | null
          allow_dms?: Database["public"]["Enums"]["dm_permission"] | null
          allow_tagging?: boolean | null
          created_at?: string | null
          id?: string
          private_profile?: boolean | null
          restrict_sensitive_content?: boolean | null
          safe_search?: boolean | null
          show_activity_status?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allow_campaign_invites?: boolean | null
          allow_comments?:
            | Database["public"]["Enums"]["comment_permission"]
            | null
          allow_dms?: Database["public"]["Enums"]["dm_permission"] | null
          allow_tagging?: boolean | null
          created_at?: string | null
          id?: string
          private_profile?: boolean | null
          restrict_sensitive_content?: boolean | null
          safe_search?: boolean | null
          show_activity_status?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_posts: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsorships: {
        Row: {
          amount: number
          campaign_id: string
          created_at: string | null
          end_date: string | null
          id: string
          sponsor_id: string
          start_date: string | null
          status: string | null
          terms: string | null
        }
        Insert: {
          amount: number
          campaign_id: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          sponsor_id: string
          start_date?: string | null
          status?: string | null
          terms?: string | null
        }
        Update: {
          amount?: number
          campaign_id?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          sponsor_id?: string
          start_date?: string | null
          status?: string | null
          terms?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsorships_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsorships_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trending_searches: {
        Row: {
          id: string
          query: string
          search_count: number | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          query: string
          search_count?: number | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          query?: string
          search_count?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tried_this: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tried_this_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tried_this_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      try_scores: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          score: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "try_scores_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "try_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      typing_indicators: {
        Row: {
          conversation_id: string
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "typing_indicators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_behavior_tracking: {
        Row: {
          completion_rate: number | null
          created_at: string | null
          event_type: string
          id: string
          post_id: string | null
          session_id: string | null
          user_id: string | null
          watch_seconds: number | null
        }
        Insert: {
          completion_rate?: number | null
          created_at?: string | null
          event_type: string
          id?: string
          post_id?: string | null
          session_id?: string | null
          user_id?: string | null
          watch_seconds?: number | null
        }
        Update: {
          completion_rate?: number | null
          created_at?: string | null
          event_type?: string
          id?: string
          post_id?: string | null
          session_id?: string | null
          user_id?: string | null
          watch_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_behavior_tracking_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_behavior_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feed_scores: {
        Row: {
          created_at: string | null
          expires_at: string | null
          feed_type: string
          id: string
          post_id: string | null
          reason: string | null
          score: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          feed_type?: string
          id?: string
          post_id?: string | null
          reason?: string | null
          score?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          feed_type?: string
          id?: string
          post_id?: string | null
          reason?: string | null
          score?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_feed_scores_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_feed_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_interests: {
        Row: {
          category: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_interests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_online_status: {
        Row: {
          is_online: boolean | null
          last_seen_at: string | null
          user_id: string
        }
        Insert: {
          is_online?: boolean | null
          last_seen_at?: string | null
          user_id: string
        }
        Update: {
          is_online?: boolean | null
          last_seen_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_online_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          account_status:
            | Database["public"]["Enums"]["user_account_status"]
            | null
          account_type: Database["public"]["Enums"]["account_type"] | null
          age_verified: boolean | null
          avatar_url: string | null
          avg_try_score: number | null
          ban_reason: string | null
          bio: string | null
          category: string | null
          cover_url: string | null
          created_at: string | null
          current_streak: number | null
          date_of_birth: string | null
          display_name: string
          email: string
          followers_count: number | null
          following_count: number | null
          id: string
          instagram_url: string | null
          is_admin: boolean | null
          is_verified: boolean | null
          last_try_date: string | null
          location: string | null
          longest_streak: number | null
          posts_count: number | null
          social_links: Json | null
          streak_badges: string[] | null
          suspension_expires_at: string | null
          tiktok_url: string | null
          total_campaign_tries: number
          total_tries: number | null
          twitter_url: string | null
          updated_at: string | null
          username: string
          website: string | null
          website_url: string | null
          weekly_progress: number | null
          youtube_url: string | null
        }
        Insert: {
          account_status?:
            | Database["public"]["Enums"]["user_account_status"]
            | null
          account_type?: Database["public"]["Enums"]["account_type"] | null
          age_verified?: boolean | null
          avatar_url?: string | null
          avg_try_score?: number | null
          ban_reason?: string | null
          bio?: string | null
          category?: string | null
          cover_url?: string | null
          created_at?: string | null
          current_streak?: number | null
          date_of_birth?: string | null
          display_name: string
          email: string
          followers_count?: number | null
          following_count?: number | null
          id: string
          instagram_url?: string | null
          is_admin?: boolean | null
          is_verified?: boolean | null
          last_try_date?: string | null
          location?: string | null
          longest_streak?: number | null
          posts_count?: number | null
          social_links?: Json | null
          streak_badges?: string[] | null
          suspension_expires_at?: string | null
          tiktok_url?: string | null
          total_campaign_tries?: number
          total_tries?: number | null
          twitter_url?: string | null
          updated_at?: string | null
          username: string
          website?: string | null
          website_url?: string | null
          weekly_progress?: number | null
          youtube_url?: string | null
        }
        Update: {
          account_status?:
            | Database["public"]["Enums"]["user_account_status"]
            | null
          account_type?: Database["public"]["Enums"]["account_type"] | null
          age_verified?: boolean | null
          avatar_url?: string | null
          avg_try_score?: number | null
          ban_reason?: string | null
          bio?: string | null
          category?: string | null
          cover_url?: string | null
          created_at?: string | null
          current_streak?: number | null
          date_of_birth?: string | null
          display_name?: string
          email?: string
          followers_count?: number | null
          following_count?: number | null
          id?: string
          instagram_url?: string | null
          is_admin?: boolean | null
          is_verified?: boolean | null
          last_try_date?: string | null
          location?: string | null
          longest_streak?: number | null
          posts_count?: number | null
          social_links?: Json | null
          streak_badges?: string[] | null
          suspension_expires_at?: string | null
          tiktok_url?: string | null
          total_campaign_tries?: number
          total_tries?: number | null
          twitter_url?: string | null
          updated_at?: string | null
          username?: string
          website?: string | null
          website_url?: string | null
          weekly_progress?: number | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          allow_messages_from: string | null
          created_at: string | null
          dark_mode: boolean | null
          digest_emails_enabled: boolean | null
          notifications_enabled: boolean | null
          private_account: boolean | null
          push_comments: boolean | null
          push_follows: boolean | null
          push_likes: boolean | null
          push_mentions: boolean | null
          show_activity_status: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allow_messages_from?: string | null
          created_at?: string | null
          dark_mode?: boolean | null
          digest_emails_enabled?: boolean | null
          notifications_enabled?: boolean | null
          private_account?: boolean | null
          push_comments?: boolean | null
          push_follows?: boolean | null
          push_likes?: boolean | null
          push_mentions?: boolean | null
          show_activity_status?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allow_messages_from?: string | null
          created_at?: string | null
          dark_mode?: boolean | null
          digest_emails_enabled?: boolean | null
          notifications_enabled?: boolean | null
          private_account?: boolean | null
          push_comments?: boolean | null
          push_follows?: boolean | null
          push_likes?: boolean | null
          push_mentions?: boolean | null
          show_activity_status?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_warnings: {
        Row: {
          acknowledged_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_acknowledged: boolean | null
          issued_by: string | null
          message: string
          related_content_id: string | null
          related_content_type:
            | Database["public"]["Enums"]["report_content_type"]
            | null
          user_id: string
          warning_type: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_acknowledged?: boolean | null
          issued_by?: string | null
          message: string
          related_content_id?: string | null
          related_content_type?:
            | Database["public"]["Enums"]["report_content_type"]
            | null
          user_id: string
          warning_type: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_acknowledged?: boolean | null
          issued_by?: string | null
          message?: string
          related_content_id?: string | null
          related_content_type?:
            | Database["public"]["Enums"]["report_content_type"]
            | null
          user_id?: string
          warning_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_warnings_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_warnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_search_users: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          account_status: Database["public"]["Enums"]["user_account_status"]
          created_at: string
          email: string
          full_name: string
          id: string
          is_admin: boolean
          username: string
        }[]
      }
      apply_to_campaign: {
        Args: { p_campaign_id: string; p_pitch?: string }
        Returns: Json
      }
      block_user: { Args: { p_user_id: string }; Returns: undefined }
      check_banned_words: { Args: { p_content: string }; Returns: boolean }
      compute_post_score: {
        Args: { p_post_id: string; p_user_id: string }
        Returns: number
      }
      create_group_conversation: {
        Args: {
          p_conversation_type?: string
          p_group_avatar_url?: string
          p_group_name: string
          p_member_ids: string[]
        }
        Returns: string
      }
      delete_conversation: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      delete_message: { Args: { p_message_id: string }; Returns: undefined }
      delete_reaction:
        | { Args: { p_post_id: string; p_user_id: string }; Returns: undefined }
        | {
            Args: { p_guest_id?: string; p_post_id: string; p_user_id: string }
            Returns: undefined
          }
      get_audience_analytics: { Args: { p_user_id: string }; Returns: Json }
      get_because_you_liked: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          because_category: string
          caption: string
          category: string
          comment_count: number
          created_at: string
          id: string
          media_type: string
          media_url: string
          must_try_count: number
          thumbnail_url: string
          title: string
          tried_count: number
          try_score: number
          user_id: string
        }[]
      }
      get_campaign_analytics: {
        Args: { p_user_id: string }
        Returns: {
          campaign_id: string
          category: string
          conversion_rate: number
          created_at: string
          flame_score: number
          joined_count: number
          title: string
          tried_count: number
          view_count: number
          viral_score: number
        }[]
      }
      get_campaign_leaderboard: {
        Args: { p_campaign_id: string; p_limit?: number }
        Returns: {
          avatar_url: string
          badges_earned: string[]
          display_name: string
          rank: number
          score: number
          streak_days: number
          user_id: string
          username: string
        }[]
      }
      get_campaign_status: { Args: { p_campaign_id: string }; Returns: string }
      get_campaigns: {
        Args: { p_category?: string; p_limit?: number; p_offset?: number }
        Returns: {
          campaign_description: string | null
          caption: string | null
          categories: string[] | null
          category: string
          comment_count: number | null
          created_at: string | null
          id: string
          is_sponsored: boolean | null
          joined_count: number
          likes_count: number | null
          location: string | null
          maybe_count: number
          media_type: string | null
          media_url: string | null
          media_urls: string[] | null
          must_try_count: number
          not_for_me_count: number
          post_type: string
          share_count: number | null
          thumbnail_url: string | null
          title: string
          tried_count: number | null
          try_score: number
          try_score_count: number
          updated_at: string | null
          user_id: string
          will_try_count: number
          worth_it_count: number
        }[]
        SetofOptions: {
          from: "*"
          to: "posts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_campaigns_filtered: {
        Args: {
          p_campaign_type?: string
          p_category?: string
          p_is_remote?: boolean
          p_limit?: number
          p_max_reward?: number
          p_min_reward?: number
          p_offset?: number
          p_sort_by?: string
        }
        Returns: {
          brand_logo: string
          brand_name: string
          brand_verified: boolean
          campaign_type: string
          category: string
          cover_image_url: string
          created_at: string
          current_participants: number
          description: string
          end_date: string
          id: string
          is_boosted: boolean
          is_featured: boolean
          is_remote: boolean
          location: string
          max_participants: number
          reward_amount: number
          reward_type: string
          start_date: string
          status: string
          title: string
          views: number
          viral_score: number
        }[]
      }
      get_conversation_messages:
        | {
            Args: {
              p_before?: string
              p_conversation_id: string
              p_limit?: number
            }
            Returns: {
              content: string
              conversation_id: string
              created_at: string
              id: string
              is_deleted: boolean
              is_read: boolean
              media_url: string
              message_type: Database["public"]["Enums"]["message_type"]
              sender_avatar_url: string
              sender_display_name: string
              sender_id: string
              sender_username: string
              shared_post_data: Json
              shared_post_id: string
            }[]
          }
        | {
            Args: { p_conversation_id: string; p_limit?: number }
            Returns: {
              content: string
              conversation_id: string
              created_at: string
              id: string
              media_url: string
              message_type: Database["public"]["Enums"]["message_type"]
              sender_id: string
            }[]
          }
      get_conversations_by_type: {
        Args: { p_account_type: string }
        Returns: {
          conversation_id: string
          is_muted: boolean
          is_online: boolean
          is_pinned: boolean
          last_message_at: string
          last_message_text: string
          other_account_type: string
          other_avatar_url: string
          other_display_name: string
          other_user_id: string
          other_username: string
          unread_count: number
        }[]
      }
      get_creator_earnings: {
        Args: { p_creator_id: string }
        Returns: {
          avg_per_campaign: number
          campaigns_completed: number
          paid_amount: number
          pending_amount: number
          total_earned: number
        }[]
      }
      get_creator_overview: {
        Args: { p_period?: string; p_user_id: string }
        Returns: Json
      }
      get_engagement_trend: {
        Args: { p_days?: number; p_user_id: string }
        Returns: {
          comments: number
          followers_gained: number
          period_date: string
          post_views: number
          reactions: number
        }[]
      }
      get_following_feed: {
        Args: { p_limit?: number; p_offset?: number; p_user_id: string }
        Returns: {
          caption: string
          category: string
          comment_count: number
          created_at: string
          id: string
          is_sponsored: boolean
          location: string
          maybe_count: number
          media_type: string
          media_url: string
          media_urls: string[]
          must_try_count: number
          not_for_me_count: number
          relevance_score: number
          share_count: number
          thumbnail_url: string
          title: string
          tried_count: number
          try_score: number
          try_score_count: number
          updated_at: string
          user_id: string
          worth_it_count: number
        }[]
      }
      get_group_conversations: {
        Args: never
        Returns: {
          conversation_id: string
          conversation_type: string
          group_avatar_url: string
          group_name: string
          is_muted: boolean
          is_pinned: boolean
          last_message_at: string
          last_message_text: string
          member_count: number
          unread_count: number
        }[]
      }
      get_group_members: {
        Args: { p_conversation_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          is_online: boolean
          role: string
          user_id: string
          username: string
        }[]
      }
      get_guest_reaction: {
        Args: { p_guest_id: string; p_post_id: string }
        Returns: {
          reaction_type: string
        }[]
      }
      get_message_reactions: {
        Args: { p_conversation_id: string }
        Returns: {
          message_id: string
          reacted_by_me: boolean
          reaction: string
          reaction_count: number
        }[]
      }
      get_message_requests: {
        Args: never
        Returns: {
          conversation_id: string
          created_at: string
          last_message_text: string
          request_id: string
          requester_avatar_url: string
          requester_display_name: string
          requester_id: string
          requester_username: string
        }[]
      }
      get_new_creators: {
        Args: { p_limit?: number; p_user_id?: string }
        Returns: {
          avatar_url: string
          bio: string
          display_name: string
          followers_count: number
          id: string
          is_following: boolean
          is_verified: boolean
          total_tries: number
          username: string
        }[]
      }
      get_or_create_conversation: {
        Args: { other_user_id: string }
        Returns: string
      }
      get_personalized_feed: {
        Args: {
          p_feed_type?: string
          p_limit?: number
          p_offset?: number
          p_user_id: string
        }
        Returns: {
          caption: string
          category: string
          comment_count: number
          created_at: string
          feed_reason: string
          feed_score: number
          id: string
          location: string
          maybe_count: number
          media_type: string
          media_url: string
          must_try_count: number
          not_for_me_count: number
          save_count: number
          thumbnail_url: string
          title: string
          tried_count: number
          try_score: number
          user_id: string
          view_count: number
          worth_it_count: number
        }[]
      }
      get_popular_videos: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          caption: string
          category: string
          comment_count: number
          created_at: string
          id: string
          media_url: string
          must_try_count: number
          thumbnail_url: string
          title: string
          tried_count: number
          try_score: number
          user_id: string
        }[]
      }
      get_post_analytics: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          avg_watch_time: number
          category: string
          comment_count: number
          completion_rate: number
          created_at: string
          engagement_rate: number
          flame_score: number
          post_id: string
          post_type: string
          reaction_count: number
          save_count: number
          share_count: number
          title: string
          tried_count: number
          view_count: number
          will_try_count: number
        }[]
      }
      get_recommended_creators: {
        Args: { p_limit?: number; p_user_id?: string }
        Returns: {
          avatar_url: string
          bio: string
          display_name: string
          followers_count: number
          id: string
          is_following: boolean
          is_verified: boolean
          total_tries: number
          username: string
        }[]
      }
      get_reports_queue: {
        Args: {
          p_content_type?: Database["public"]["Enums"]["report_content_type"]
          p_limit?: number
          p_offset?: number
          p_status?: Database["public"]["Enums"]["report_status"]
        }
        Returns: {
          content_id: string
          content_type: Database["public"]["Enums"]["report_content_type"]
          created_at: string
          description: string
          id: string
          reason: Database["public"]["Enums"]["report_reason"]
          report_status: Database["public"]["Enums"]["report_status"]
          reported_user_id: string
          reported_username: string
          reporter_id: string
          reporter_username: string
        }[]
      }
      get_safety_settings: {
        Args: never
        Returns: {
          allow_campaign_invites: boolean | null
          allow_comments:
            | Database["public"]["Enums"]["comment_permission"]
            | null
          allow_dms: Database["public"]["Enums"]["dm_permission"] | null
          allow_tagging: boolean | null
          created_at: string | null
          id: string
          private_profile: boolean | null
          restrict_sensitive_content: boolean | null
          safe_search: boolean | null
          show_activity_status: boolean | null
          updated_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "safety_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_strict_following_feed: {
        Args: { p_limit?: number; p_offset?: number; p_user_id: string }
        Returns: {
          caption: string
          category: string
          comment_count: number
          created_at: string
          id: string
          is_sponsored: boolean
          location: string
          maybe_count: number
          media_type: string
          media_url: string
          media_urls: string[]
          must_try_count: number
          not_for_me_count: number
          share_count: number
          thumbnail_url: string
          title: string
          tried_count: number
          try_score: number
          try_score_count: number
          updated_at: string
          user_id: string
          worth_it_count: number
        }[]
      }
      get_suggested_users: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          avatar_url: string
          bio: string
          display_name: string
          followers_count: number
          following_count: number
          id: string
          is_verified: boolean
          mutual_follows_count: number
          username: string
        }[]
      }
      get_total_unread_count: { Args: never; Returns: number }
      get_trending_campaigns: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          brand_logo: string
          brand_name: string
          brand_verified: boolean
          campaign_type: string
          category: string
          cover_image_url: string
          created_at: string
          current_participants: number
          description: string
          end_date: string
          id: string
          is_boosted: boolean
          is_featured: boolean
          is_remote: boolean
          location: string
          max_participants: number
          reward_amount: number
          reward_type: string
          start_date: string
          status: string
          title: string
          views: number
          viral_score: number
        }[]
      }
      get_trending_posts: {
        Args: { p_category?: string; p_limit?: number; p_offset?: number }
        Returns: {
          caption: string
          category: string
          comment_count: number
          created_at: string
          engagement_score: number
          id: string
          location: string
          maybe_count: number
          media_type: string
          media_url: string
          must_try_count: number
          not_for_me_count: number
          thumbnail_url: string
          title: string
          tried_count: number
          try_score: number
          user_id: string
          worth_it_count: number
        }[]
      }
      get_user_conversations: {
        Args: never
        Returns: {
          conversation_id: string
          last_message_at: string
          last_message_text: string
          other_avatar_url: string
          other_display_name: string
          other_user_id: string
          other_username: string
          unread_count: number
        }[]
      }
      get_viral_posts: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          caption: string
          category: string
          comment_count: number
          created_at: string
          id: string
          media_type: string
          media_url: string
          must_try_count: number
          thumbnail_url: string
          title: string
          tried_count: number
          try_score: number
          user_id: string
          viral_score: number
        }[]
      }
      hide_post: { Args: { p_post_id: string }; Returns: undefined }
      increment_comment_count: {
        Args: { p_post_id: string }
        Returns: undefined
      }
      is_admin_user: { Args: never; Returns: boolean }
      is_blocked_by: { Args: { target_user_id: string }; Returns: boolean }
      is_username_available: {
        Args: { p_current_user_id?: string; p_username: string }
        Returns: boolean
      }
      join_campaign: {
        Args: { p_campaign_id: string; p_status?: string }
        Returns: Json
      }
      mark_conversation_read: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      mute_user: { Args: { p_user_id: string }; Returns: undefined }
      notify_campaign_alert: {
        Args: {
          p_alert_message: string
          p_campaign_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      notify_nearby_try: {
        Args: {
          p_location_label?: string
          p_post_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      notify_trending_post: {
        Args: { p_post_id: string; p_threshold_label?: string }
        Returns: undefined
      }
      notify_weekly_engagement: {
        Args: {
          p_new_followers: number
          p_reactions: number
          p_triers: number
          p_user_id: string
        }
        Returns: undefined
      }
      record_search: {
        Args: { p_query: string; p_session_id?: string; p_user_id?: string }
        Returns: undefined
      }
      refresh_creator_quality_score: {
        Args: { p_creator_id: string }
        Returns: undefined
      }
      respond_to_message_request: {
        Args: { p_accept: boolean; p_request_id: string }
        Returns: undefined
      }
      review_campaign_application: {
        Args: {
          p_application_id: string
          p_rejection_reason?: string
          p_status: string
        }
        Returns: Json
      }
      send_message:
        | {
            Args: { p_content: string; p_conversation_id: string }
            Returns: undefined
          }
        | {
            Args: {
              p_content?: string
              p_conversation_id: string
              p_media_url?: string
              p_message_type?: string
              p_shared_post_data?: Json
              p_shared_post_id?: string
            }
            Returns: string
          }
      send_message_request: {
        Args: { p_recipient_id: string }
        Returns: string
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      submit_appeal: {
        Args: { p_appeal_reason: string; p_moderation_action_id: string }
        Returns: string
      }
      submit_report: {
        Args: {
          p_content_id: string
          p_content_type: Database["public"]["Enums"]["report_content_type"]
          p_description?: string
          p_reason: Database["public"]["Enums"]["report_reason"]
          p_reported_user_id: string
        }
        Returns: string
      }
      sync_comment_count: { Args: { p_post_id: string }; Returns: undefined }
      take_moderation_action: {
        Args: {
          p_action_type: Database["public"]["Enums"]["moderation_action_type"]
          p_content_id?: string
          p_content_type?: Database["public"]["Enums"]["report_content_type"]
          p_duration_hours?: number
          p_notes?: string
          p_reason: string
          p_report_id?: string
          p_target_user_id: string
        }
        Returns: string
      }
      toggle_message_reaction: {
        Args: { p_message_id: string; p_reaction: string }
        Returns: boolean
      }
      toggle_mute_conversation: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      toggle_pin_conversation: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      track_user_behavior: {
        Args: {
          p_completion_rate?: number
          p_event_type: string
          p_post_id: string
          p_session_id?: string
          p_user_id: string
          p_watch_seconds?: number
        }
        Returns: undefined
      }
      unblock_user: { Args: { p_user_id: string }; Returns: undefined }
      unmute_user: { Args: { p_user_id: string }; Returns: undefined }
      update_online_status: {
        Args: { p_is_online: boolean }
        Returns: undefined
      }
      update_typing_indicator: {
        Args: { p_conversation_id: string; p_is_typing: boolean }
        Returns: undefined
      }
      update_user_interest: {
        Args: { p_category: string; p_user_id: string }
        Returns: undefined
      }
      upsert_reaction:
        | {
            Args: {
              p_guest_id?: string
              p_post_id: string
              p_reaction: string
              p_user_id?: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_guest_id?: string
              p_post_id: string
              p_reaction: string
              p_user_id?: string
            }
            Returns: undefined
          }
      verify_user_age: {
        Args: { p_dob: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      account_type: "personal" | "business" | "regular" | "creator" | "brand"
      appeal_status: "pending" | "under_review" | "approved" | "rejected"
      application_status: "pending" | "approved" | "denied" | "withdrawn"
      campaign_status: "draft" | "active" | "paused" | "completed" | "cancelled"
      campaign_type:
        | "product_trial"
        | "restaurant_challenge"
        | "fitness_challenge"
        | "travel_experience"
        | "local_business"
        | "viral_trend"
        | "creator_collab"
        | "community_challenge"
      comment_permission: "everyone" | "followers" | "nobody"
      dm_permission: "everyone" | "followers" | "nobody"
      error_category:
        | "crash"
        | "authentication"
        | "upload"
        | "feed_loading"
        | "video_playback"
        | "network"
        | "api"
        | "comments"
        | "profile_loading"
        | "unknown"
      error_severity: "low" | "medium" | "high" | "critical"
      message_type:
        | "text"
        | "image"
        | "video"
        | "shared_post"
        | "emoji"
        | "voice"
        | "gif"
        | "sticker"
        | "campaign"
      moderation_action_type:
        | "warn"
        | "remove_content"
        | "suspend_user"
        | "ban_user"
        | "unban_user"
        | "dismiss_report"
        | "escalate_report"
        | "verify_user"
        | "restrict_user"
        | "flag_content"
      notification_type:
        | "follow"
        | "comment"
        | "reaction"
        | "tried"
        | "streak_reminder"
        | "mention"
        | "challenge_invite"
        | "trending_post"
        | "nearby_try"
        | "campaign_alert"
        | "weekly_engagement"
      payout_status: "pending" | "processing" | "paid" | "failed"
      reaction_type: "must_try" | "worth_it" | "maybe" | "not_for_me"
      report_content_type: "post" | "comment" | "user" | "campaign" | "message"
      report_reason:
        | "spam"
        | "harassment"
        | "hate_speech"
        | "nudity_sexual_content"
        | "violence"
        | "scams_fraud"
        | "dangerous_challenges"
        | "self_harm"
        | "impersonation"
        | "copyright_trademark"
        | "other"
      report_status:
        | "pending"
        | "under_review"
        | "resolved"
        | "dismissed"
        | "escalated"
      reward_type:
        | "cash"
        | "product"
        | "gift_card"
        | "badge"
        | "discount"
        | "experience"
      user_account_status:
        | "active"
        | "warned"
        | "restricted"
        | "suspended"
        | "banned"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_type: ["personal", "business", "regular", "creator", "brand"],
      appeal_status: ["pending", "under_review", "approved", "rejected"],
      application_status: ["pending", "approved", "denied", "withdrawn"],
      campaign_status: ["draft", "active", "paused", "completed", "cancelled"],
      campaign_type: [
        "product_trial",
        "restaurant_challenge",
        "fitness_challenge",
        "travel_experience",
        "local_business",
        "viral_trend",
        "creator_collab",
        "community_challenge",
      ],
      comment_permission: ["everyone", "followers", "nobody"],
      dm_permission: ["everyone", "followers", "nobody"],
      error_category: [
        "crash",
        "authentication",
        "upload",
        "feed_loading",
        "video_playback",
        "network",
        "api",
        "comments",
        "profile_loading",
        "unknown",
      ],
      error_severity: ["low", "medium", "high", "critical"],
      message_type: [
        "text",
        "image",
        "video",
        "shared_post",
        "emoji",
        "voice",
        "gif",
        "sticker",
        "campaign",
      ],
      moderation_action_type: [
        "warn",
        "remove_content",
        "suspend_user",
        "ban_user",
        "unban_user",
        "dismiss_report",
        "escalate_report",
        "verify_user",
        "restrict_user",
        "flag_content",
      ],
      notification_type: [
        "follow",
        "comment",
        "reaction",
        "tried",
        "streak_reminder",
        "mention",
        "challenge_invite",
        "trending_post",
        "nearby_try",
        "campaign_alert",
        "weekly_engagement",
      ],
      payout_status: ["pending", "processing", "paid", "failed"],
      reaction_type: ["must_try", "worth_it", "maybe", "not_for_me"],
      report_content_type: ["post", "comment", "user", "campaign", "message"],
      report_reason: [
        "spam",
        "harassment",
        "hate_speech",
        "nudity_sexual_content",
        "violence",
        "scams_fraud",
        "dangerous_challenges",
        "self_harm",
        "impersonation",
        "copyright_trademark",
        "other",
      ],
      report_status: [
        "pending",
        "under_review",
        "resolved",
        "dismissed",
        "escalated",
      ],
      reward_type: [
        "cash",
        "product",
        "gift_card",
        "badge",
        "discount",
        "experience",
      ],
      user_account_status: [
        "active",
        "warned",
        "restricted",
        "suspended",
        "banned",
      ],
    },
  },
} as const
