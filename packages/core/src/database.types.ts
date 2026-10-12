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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      competitions: {
        Row: {
          created_at: string
          created_by: string | null
          ends_on: string
          group_id: string
          id: string
          name: string
          starts_on: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_on: string
          group_id: string
          id?: string
          name: string
          starts_on: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_on?: string
          group_id?: string
          id?: string
          name?: string
          starts_on?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_posted: {
        Row: {
          attempts: number
          created_at: string
          group_id: string
          id: string
          key: string
          kind: string
          last_error: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          group_id: string
          id?: string
          key: string
          kind: string
          last_error?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          group_id?: string
          id?: string
          key?: string
          kind?: string
          last_error?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "discord_posted_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_record_state: {
        Row: {
          category_key: string
          group_id: string
          holder_ids: string[]
          updated_at: string
          value: number | null
        }
        Insert: {
          category_key: string
          group_id: string
          holder_ids?: string[]
          updated_at?: string
          value?: number | null
        }
        Update: {
          category_key?: string
          group_id?: string
          holder_ids?: string[]
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "discord_record_state_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_discord: {
        Row: {
          created_at: string
          enabled: boolean
          enabled_at: string | null
          group_id: string
          last_error: string | null
          last_error_at: string | null
          last_nights_seen_at: string | null
          last_post_at: string | null
          last_test_at: string | null
          period_kinds: string[]
          post_championships: boolean
          post_hour: number
          post_records: boolean
          processing_until: string | null
          records_baselined_at: string | null
          updated_at: string
          webhook_configured: boolean | null
          webhook_hint: string | null
          webhook_status: string
          webhook_url: string | null
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          enabled_at?: string | null
          group_id: string
          last_error?: string | null
          last_error_at?: string | null
          last_nights_seen_at?: string | null
          last_post_at?: string | null
          last_test_at?: string | null
          period_kinds?: string[]
          post_championships?: boolean
          post_hour?: number
          post_records?: boolean
          processing_until?: string | null
          records_baselined_at?: string | null
          updated_at?: string
          webhook_configured?: boolean | null
          webhook_hint?: string | null
          webhook_status?: string
          webhook_url?: string | null
        }
        Update: {
          created_at?: string
          enabled?: boolean
          enabled_at?: string | null
          group_id?: string
          last_error?: string | null
          last_error_at?: string | null
          last_nights_seen_at?: string | null
          last_post_at?: string | null
          last_test_at?: string | null
          period_kinds?: string[]
          post_championships?: boolean
          post_hour?: number
          post_records?: boolean
          processing_until?: string | null
          records_baselined_at?: string | null
          updated_at?: string
          webhook_configured?: boolean | null
          webhook_hint?: string | null
          webhook_status?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_discord_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: true
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_invites: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string
          group_id: string
          id: string
          max_uses: number
          revoked_at: string | null
          uses: number
        }
        Insert: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          group_id: string
          id?: string
          max_uses?: number
          revoked_at?: string | null
          uses?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          group_id?: string
          id?: string
          max_uses?: number
          revoked_at?: string | null
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "group_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_invites_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          joined_at: string
          role: Database["public"]["Enums"]["group_role"]
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          role?: Database["public"]["Enums"]["group_role"]
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["group_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          blackout_enabled: boolean
          blackout_end: string
          blackout_start: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          settings: Json
          timezone: string
          updated_at: string
        }
        Insert: {
          blackout_enabled?: boolean
          blackout_end?: string
          blackout_start?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          settings?: Json
          timezone?: string
          updated_at?: string
        }
        Update: {
          blackout_enabled?: boolean
          blackout_end?: string
          blackout_start?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          settings?: Json
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ingest_events: {
        Row: {
          created_at: string
          id: string
          nights_written: number
          segment_count: number
          token_id: string | null
          trigger_label: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nights_written: number
          segment_count: number
          token_id?: string | null
          trigger_label?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nights_written?: number
          segment_count?: number
          token_id?: string | null
          trigger_label?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingest_events_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "ingest_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingest_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ingest_tokens: {
        Row: {
          created_at: string
          id: string
          label: string
          last_used_at: string | null
          revoked_at: string | null
          token_hash: string
          token_prefix: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          last_used_at?: string | null
          revoked_at?: string | null
          token_hash: string
          token_prefix: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          last_used_at?: string | null
          revoked_at?: string | null
          token_hash?: string
          token_prefix?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingest_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          blackout_enabled: boolean
          blackout_end: string
          blackout_lead_min: number
          blackout_mode: string
          blackout_start: string
          created_at: string
          display_name: string
          full_name: string | null
          id: string
          onboarded_at: string | null
          sleep_source: string | null
          target_bedtime: string
          target_wake: string
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          blackout_enabled?: boolean
          blackout_end?: string
          blackout_lead_min?: number
          blackout_mode?: string
          blackout_start?: string
          created_at?: string
          display_name: string
          full_name?: string | null
          id: string
          onboarded_at?: string | null
          sleep_source?: string | null
          target_bedtime?: string
          target_wake?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          blackout_enabled?: boolean
          blackout_end?: string
          blackout_lead_min?: number
          blackout_mode?: string
          blackout_start?: string
          created_at?: string
          display_name?: string
          full_name?: string | null
          id?: string
          onboarded_at?: string | null
          sleep_source?: string | null
          target_bedtime?: string
          target_wake?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      sleep_nights: {
        Row: {
          awake_min: number | null
          created_at: string
          deep_min: number | null
          device_class: string
          duration_min: number
          night_date: string
          raw: Json | null
          rem_min: number | null
          restorative_min: number | null
          score: number | null
          sleep_end: string | null
          sleep_start: string | null
          source: string
          timezone: string | null
          updated_at: string
          user_id: string
          wake_count: number | null
        }
        Insert: {
          awake_min?: number | null
          created_at?: string
          deep_min?: number | null
          device_class?: string
          duration_min: number
          night_date: string
          raw?: Json | null
          rem_min?: number | null
          restorative_min?: number | null
          score?: number | null
          sleep_end?: string | null
          sleep_start?: string | null
          source: string
          timezone?: string | null
          updated_at?: string
          user_id: string
          wake_count?: number | null
        }
        Update: {
          awake_min?: number | null
          created_at?: string
          deep_min?: number | null
          device_class?: string
          duration_min?: number
          night_date?: string
          raw?: Json | null
          rem_min?: number | null
          restorative_min?: number | null
          score?: number | null
          sleep_end?: string | null
          sleep_start?: string | null
          source?: string
          timezone?: string | null
          updated_at?: string
          user_id?: string
          wake_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sleep_nights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_invite: {
        Args: { p_code: string }
        Returns: {
          group_name: string
          valid: boolean
        }[]
      }
      clear_group_discord_webhook: {
        Args: { p_group_id: string }
        Returns: undefined
      }
      create_competition: {
        Args: {
          p_ends_on: string
          p_group_id: string
          p_name: string
          p_starts_on: string
        }
        Returns: string
      }
      create_group: { Args: { p_name: string }; Returns: string }
      create_ingest_token: { Args: { p_label: string }; Returns: string }
      create_invite: {
        Args: { p_expires_in?: string; p_group_id: string; p_max_uses?: number }
        Returns: string
      }
      delete_competition: { Args: { p_id: string }; Returns: undefined }
      delete_my_account: { Args: never; Returns: undefined }
      import_sleep_segments: { Args: { p_segments: Json }; Returns: Json }
      ingest_sleep_night: {
        Args: {
          p_deep_min?: number
          p_duration_min: number
          p_night_date: string
          p_raw?: Json
          p_rem_min?: number
          p_restorative_min?: number
          p_score?: number
          p_sleep_end?: string
          p_sleep_start?: string
          p_source?: string
          p_token: string
        }
        Returns: undefined
      }
      ingest_sleep_segments: {
        Args: {
          p_segments: Json
          p_source?: string
          p_token: string
          p_trigger?: string
        }
        Returns: Json
      }
      join_group: { Args: { p_code: string }; Returns: string }
      leave_group: { Args: { p_group_id: string }; Returns: undefined }
      remove_member: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: undefined
      }
      revoke_ingest_token: { Args: { p_token_id: string }; Returns: undefined }
      revoke_invite: { Args: { p_invite_id: string }; Returns: undefined }
      set_group_blackout: {
        Args: {
          p_enabled: boolean
          p_end: string
          p_group_id: string
          p_start: string
        }
        Returns: undefined
      }
      set_group_discord_webhook: {
        Args: { p_group_id: string; p_url: string }
        Returns: undefined
      }
      set_member_role: {
        Args: {
          p_group_id: string
          p_role: Database["public"]["Enums"]["group_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      transfer_ownership: {
        Args: { p_group_id: string; p_new_owner: string }
        Returns: undefined
      }
      update_competition: {
        Args: {
          p_ends_on: string
          p_id: string
          p_name: string
          p_starts_on: string
        }
        Returns: undefined
      }
      update_group_discord: {
        Args: {
          p_enabled?: boolean
          p_group_id: string
          p_period_kinds?: string[]
          p_post_championships?: boolean
          p_post_hour?: number
          p_post_records?: boolean
        }
        Returns: undefined
      }
    }
    Enums: {
      group_role: "owner" | "admin" | "member"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      group_role: ["owner", "admin", "member"],
    },
  },
} as const
