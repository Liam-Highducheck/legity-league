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
          created_at: string
          created_by: string | null
          id: string
          name: string
          settings: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          settings?: Json
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
      create_group: { Args: { p_name: string }; Returns: string }
      create_ingest_token: { Args: { p_label: string }; Returns: string }
      create_invite: {
        Args: { p_expires_in?: string; p_group_id: string; p_max_uses?: number }
        Returns: string
      }
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
