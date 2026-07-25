// GENERATED FILE — do not edit by hand.
// Regenerate with `bun run db:types` from the local Supabase stack.
// Reflects the Identity & Household foundation (WP3). RLS is enabled with
// no policies and no client grants, so these tables are not reachable from
// the browser yet — see docs/decisions.md (ADR-023).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      household_invitations: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          household_id: string
          id: string
          invited_email: string | null
          max_uses: number
          revoked_at: string | null
          role: Database["public"]["Enums"]["household_role"]
          token_hash: string
          updated_at: string
          used_count: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at: string
          household_id: string
          id?: string
          invited_email?: string | null
          max_uses?: number
          revoked_at?: string | null
          role: Database["public"]["Enums"]["household_role"]
          token_hash: string
          updated_at?: string
          used_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          household_id?: string
          id?: string
          invited_email?: string | null
          max_uses?: number
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["household_role"]
          token_hash?: string
          updated_at?: string
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "household_invitations_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          access_expires_at: string | null
          auth_user_id: string | null
          created_at: string
          household_id: string
          id: string
          joined_at: string | null
          profile_id: string
          role: Database["public"]["Enums"]["household_role"]
          status: Database["public"]["Enums"]["household_membership_status"]
          updated_at: string
        }
        Insert: {
          access_expires_at?: string | null
          auth_user_id?: string | null
          created_at?: string
          household_id: string
          id?: string
          joined_at?: string | null
          profile_id: string
          role: Database["public"]["Enums"]["household_role"]
          status?: Database["public"]["Enums"]["household_membership_status"]
          updated_at?: string
        }
        Update: {
          access_expires_at?: string | null
          auth_user_id?: string | null
          created_at?: string
          household_id?: string
          id?: string
          joined_at?: string | null
          profile_id?: string
          role?: Database["public"]["Enums"]["household_role"]
          status?: Database["public"]["Enums"]["household_membership_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_members_profile_same_household_fkey"
            columns: ["profile_id", "household_id"]
            isOneToOne: false
            referencedRelation: "member_profiles"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          locale: string
          name: string
          quiet_hours_end: string
          quiet_hours_start: string
          timezone: string
          updated_at: string
          week_starts_on: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          locale?: string
          name: string
          quiet_hours_end?: string
          quiet_hours_start?: string
          timezone?: string
          updated_at?: string
          week_starts_on?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          locale?: string
          name?: string
          quiet_hours_end?: string
          quiet_hours_start?: string
          timezone?: string
          updated_at?: string
          week_starts_on?: number
        }
        Relationships: []
      }
      member_profiles: {
        Row: {
          avatar_path: string | null
          color_token: string | null
          created_at: string
          date_of_birth: string | null
          deleted_at: string | null
          deleted_by: string | null
          display_name: string
          household_id: string
          id: string
          is_active: boolean
          is_child: boolean
          pin_auth_enabled: boolean
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          color_token?: string | null
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          display_name: string
          household_id: string
          id?: string
          is_active?: boolean
          is_child?: boolean
          pin_auth_enabled?: boolean
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          color_token?: string | null
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          display_name?: string
          household_id?: string
          id?: string
          is_active?: boolean
          is_child?: boolean
          pin_auth_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_profiles_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      household_membership_status:
        | "invited"
        | "active"
        | "suspended"
        | "revoked"
      household_role: "owner" | "adult" | "child" | "guest" | "service_provider"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      household_membership_status: [
        "invited",
        "active",
        "suspended",
        "revoked",
      ],
      household_role: ["owner", "adult", "child", "guest", "service_provider"],
    },
  },
} as const

