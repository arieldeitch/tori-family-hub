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
      rotation_assignment_log: {
        Row: {
          algorithm_version: string
          candidate_snapshot: Json | null
          client_operation_id: string | null
          created_at: string
          cursor_before_profile_id: string | null
          decided_at: string
          household_id: string
          human_explanation: string | null
          id: string
          reason_code: string
          rotation_rule_id: string
          selected_profile_id: string | null
          task_instance_id: string
          warnings: Json | null
        }
        Insert: {
          algorithm_version: string
          candidate_snapshot?: Json | null
          client_operation_id?: string | null
          created_at?: string
          cursor_before_profile_id?: string | null
          decided_at?: string
          household_id: string
          human_explanation?: string | null
          id?: string
          reason_code: string
          rotation_rule_id: string
          selected_profile_id?: string | null
          task_instance_id: string
          warnings?: Json | null
        }
        Update: {
          algorithm_version?: string
          candidate_snapshot?: Json | null
          client_operation_id?: string | null
          created_at?: string
          cursor_before_profile_id?: string | null
          decided_at?: string
          household_id?: string
          human_explanation?: string | null
          id?: string
          reason_code?: string
          rotation_rule_id?: string
          selected_profile_id?: string | null
          task_instance_id?: string
          warnings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "rotation_assignment_log_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotation_assignment_log_instance_same_household_fkey"
            columns: ["task_instance_id", "household_id"]
            isOneToOne: false
            referencedRelation: "task_instances"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "rotation_assignment_log_rule_same_household_fkey"
            columns: ["rotation_rule_id", "household_id"]
            isOneToOne: false
            referencedRelation: "rotation_rules"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "rotation_assignment_log_selected_same_household_fkey"
            columns: ["selected_profile_id", "household_id"]
            isOneToOne: false
            referencedRelation: "member_profiles"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      rotation_members: {
        Row: {
          created_at: string
          created_by: string | null
          household_id: string
          id: string
          is_eligible: boolean
          member_profile_id: string
          position: number
          rotation_rule_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          household_id: string
          id?: string
          is_eligible?: boolean
          member_profile_id: string
          position: number
          rotation_rule_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          household_id?: string
          id?: string
          is_eligible?: boolean
          member_profile_id?: string
          position?: number
          rotation_rule_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rotation_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotation_members_profile_same_household_fkey"
            columns: ["member_profile_id", "household_id"]
            isOneToOne: false
            referencedRelation: "member_profiles"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "rotation_members_rule_same_household_fkey"
            columns: ["rotation_rule_id", "household_id"]
            isOneToOne: false
            referencedRelation: "rotation_rules"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      rotation_rules: {
        Row: {
          advance_mode: Database["public"]["Enums"]["rotation_advance_mode"]
          algorithm_version: string
          avoid_consecutive: boolean
          created_at: string
          created_by: string | null
          cursor_advanced_at: string | null
          cursor_profile_id: string | null
          deleted_at: string | null
          deleted_by: string | null
          fallback: Database["public"]["Enums"]["rotation_fallback"]
          household_id: string
          id: string
          is_active: boolean
          strategy: Database["public"]["Enums"]["rotation_strategy"]
          task_template_id: string
          updated_at: string
          updated_by: string | null
          weekday_map: Json
        }
        Insert: {
          advance_mode?: Database["public"]["Enums"]["rotation_advance_mode"]
          algorithm_version?: string
          avoid_consecutive?: boolean
          created_at?: string
          created_by?: string | null
          cursor_advanced_at?: string | null
          cursor_profile_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          fallback?: Database["public"]["Enums"]["rotation_fallback"]
          household_id: string
          id?: string
          is_active?: boolean
          strategy?: Database["public"]["Enums"]["rotation_strategy"]
          task_template_id: string
          updated_at?: string
          updated_by?: string | null
          weekday_map?: Json
        }
        Update: {
          advance_mode?: Database["public"]["Enums"]["rotation_advance_mode"]
          algorithm_version?: string
          avoid_consecutive?: boolean
          created_at?: string
          created_by?: string | null
          cursor_advanced_at?: string | null
          cursor_profile_id?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          fallback?: Database["public"]["Enums"]["rotation_fallback"]
          household_id?: string
          id?: string
          is_active?: boolean
          strategy?: Database["public"]["Enums"]["rotation_strategy"]
          task_template_id?: string
          updated_at?: string
          updated_by?: string | null
          weekday_map?: Json
        }
        Relationships: [
          {
            foreignKeyName: "rotation_rules_cursor_same_household_fkey"
            columns: ["cursor_profile_id", "household_id"]
            isOneToOne: false
            referencedRelation: "member_profiles"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "rotation_rules_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotation_rules_template_same_household_fkey"
            columns: ["task_template_id", "household_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      task_activity_log: {
        Row: {
          acting_profile_id: string | null
          action_type: Database["public"]["Enums"]["task_activity_action"]
          actor_auth_user_id: string | null
          client_operation_id: string | null
          created_at: string
          detail: Json | null
          from_state: Database["public"]["Enums"]["task_status"] | null
          household_id: string
          id: string
          occurred_at: string
          task_instance_id: string
          to_state: Database["public"]["Enums"]["task_status"] | null
        }
        Insert: {
          acting_profile_id?: string | null
          action_type: Database["public"]["Enums"]["task_activity_action"]
          actor_auth_user_id?: string | null
          client_operation_id?: string | null
          created_at?: string
          detail?: Json | null
          from_state?: Database["public"]["Enums"]["task_status"] | null
          household_id: string
          id?: string
          occurred_at?: string
          task_instance_id: string
          to_state?: Database["public"]["Enums"]["task_status"] | null
        }
        Update: {
          acting_profile_id?: string | null
          action_type?: Database["public"]["Enums"]["task_activity_action"]
          actor_auth_user_id?: string | null
          client_operation_id?: string | null
          created_at?: string
          detail?: Json | null
          from_state?: Database["public"]["Enums"]["task_status"] | null
          household_id?: string
          id?: string
          occurred_at?: string
          task_instance_id?: string
          to_state?: Database["public"]["Enums"]["task_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "task_activity_log_acting_profile_same_household_fkey"
            columns: ["acting_profile_id", "household_id"]
            isOneToOne: false
            referencedRelation: "member_profiles"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "task_activity_log_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_activity_log_instance_same_household_fkey"
            columns: ["task_instance_id", "household_id"]
            isOneToOne: false
            referencedRelation: "task_instances"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      task_assignments: {
        Row: {
          accepted_at: string | null
          algorithm_version: string | null
          assigned_by_rule_id: string | null
          assignee_profile_id: string | null
          assignment_reason: string | null
          assignment_type: Database["public"]["Enums"]["task_assignment_type"]
          created_at: string
          created_by: string | null
          household_id: string
          id: string
          reason_code: string | null
          status: Database["public"]["Enums"]["task_assignment_status"]
          task_instance_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          accepted_at?: string | null
          algorithm_version?: string | null
          assigned_by_rule_id?: string | null
          assignee_profile_id?: string | null
          assignment_reason?: string | null
          assignment_type?: Database["public"]["Enums"]["task_assignment_type"]
          created_at?: string
          created_by?: string | null
          household_id: string
          id?: string
          reason_code?: string | null
          status?: Database["public"]["Enums"]["task_assignment_status"]
          task_instance_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          accepted_at?: string | null
          algorithm_version?: string | null
          assigned_by_rule_id?: string | null
          assignee_profile_id?: string | null
          assignment_reason?: string | null
          assignment_type?: Database["public"]["Enums"]["task_assignment_type"]
          created_at?: string
          created_by?: string | null
          household_id?: string
          id?: string
          reason_code?: string | null
          status?: Database["public"]["Enums"]["task_assignment_status"]
          task_instance_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_assignments_assignee_same_household_fkey"
            columns: ["assignee_profile_id", "household_id"]
            isOneToOne: false
            referencedRelation: "member_profiles"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "task_assignments_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_instance_same_household_fkey"
            columns: ["task_instance_id", "household_id"]
            isOneToOne: false
            referencedRelation: "task_instances"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "task_assignments_rule_same_household_fkey"
            columns: ["assigned_by_rule_id", "household_id"]
            isOneToOne: false
            referencedRelation: "rotation_rules"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      task_instances: {
        Row: {
          blocked_reason: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description_snapshot: string | null
          due_at: string | null
          household_id: string
          id: string
          manual_override: boolean
          occurrence_date: string
          occurrence_key: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          scheduled_for: string | null
          skipped_reason: string | null
          source: Database["public"]["Enums"]["task_source"]
          status: Database["public"]["Enums"]["task_status"]
          template_id: string | null
          title_snapshot: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          blocked_reason?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description_snapshot?: string | null
          due_at?: string | null
          household_id: string
          id?: string
          manual_override?: boolean
          occurrence_date: string
          occurrence_key?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          scheduled_for?: string | null
          skipped_reason?: string | null
          source?: Database["public"]["Enums"]["task_source"]
          status?: Database["public"]["Enums"]["task_status"]
          template_id?: string | null
          title_snapshot: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          blocked_reason?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description_snapshot?: string | null
          due_at?: string | null
          household_id?: string
          id?: string
          manual_override?: boolean
          occurrence_date?: string
          occurrence_key?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          scheduled_for?: string | null
          skipped_reason?: string | null
          source?: Database["public"]["Enums"]["task_source"]
          status?: Database["public"]["Enums"]["task_status"]
          template_id?: string | null
          title_snapshot?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_instances_completed_by_same_household_fkey"
            columns: ["completed_by", "household_id"]
            isOneToOne: false
            referencedRelation: "member_profiles"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "task_instances_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_instances_template_same_household_fkey"
            columns: ["template_id", "household_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      task_templates: {
        Row: {
          adult_only: boolean
          approval_required: boolean
          area_or_room: string | null
          category: string | null
          created_at: string
          created_by: string | null
          default_priority: Database["public"]["Enums"]["task_priority"]
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          effort_level: Database["public"]["Enums"]["task_effort_level"] | null
          ends_on: string | null
          estimated_minutes: number | null
          household_id: string
          id: string
          is_active: boolean
          missed_policy: Database["public"]["Enums"]["task_missed_policy"]
          recurrence_rule: Json
          starts_on: string
          time_window_end: string | null
          time_window_start: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          adult_only?: boolean
          approval_required?: boolean
          area_or_room?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          default_priority?: Database["public"]["Enums"]["task_priority"]
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          effort_level?: Database["public"]["Enums"]["task_effort_level"] | null
          ends_on?: string | null
          estimated_minutes?: number | null
          household_id: string
          id?: string
          is_active?: boolean
          missed_policy?: Database["public"]["Enums"]["task_missed_policy"]
          recurrence_rule?: Json
          starts_on?: string
          time_window_end?: string | null
          time_window_start?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          adult_only?: boolean
          approval_required?: boolean
          area_or_room?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          default_priority?: Database["public"]["Enums"]["task_priority"]
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          effort_level?: Database["public"]["Enums"]["task_effort_level"] | null
          ends_on?: string | null
          estimated_minutes?: number | null
          household_id?: string
          id?: string
          is_active?: boolean
          missed_policy?: Database["public"]["Enums"]["task_missed_policy"]
          recurrence_rule?: Json
          starts_on?: string
          time_window_end?: string | null
          time_window_start?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_household_id_fkey"
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
      rotation_advance_mode: "per_occurrence" | "per_week"
      rotation_fallback: "unassigned" | "next_available_in_sequence"
      rotation_strategy: "fixed_sequence" | "weekday_fixed" | "manual"
      task_activity_action:
        | "created"
        | "assigned"
        | "unassigned"
        | "status_changed"
        | "reopened"
        | "edited"
        | "soft_deleted"
        | "restored"
      task_assignment_status:
        | "proposed"
        | "accepted"
        | "declined"
        | "reassigned"
      task_assignment_type: "rotation" | "manual" | "volunteer"
      task_effort_level: "light" | "medium" | "heavy"
      task_missed_policy: "remain_overdue" | "auto_skip" | "reschedule_next"
      task_priority: "low" | "normal" | "high"
      task_source: "generated" | "manual" | "quick_add"
      task_status: "pending" | "done" | "skipped" | "blocked"
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
      rotation_advance_mode: ["per_occurrence", "per_week"],
      rotation_fallback: ["unassigned", "next_available_in_sequence"],
      rotation_strategy: ["fixed_sequence", "weekday_fixed", "manual"],
      task_activity_action: [
        "created",
        "assigned",
        "unassigned",
        "status_changed",
        "reopened",
        "edited",
        "soft_deleted",
        "restored",
      ],
      task_assignment_status: [
        "proposed",
        "accepted",
        "declined",
        "reassigned",
      ],
      task_assignment_type: ["rotation", "manual", "volunteer"],
      task_effort_level: ["light", "medium", "heavy"],
      task_missed_policy: ["remain_overdue", "auto_skip", "reschedule_next"],
      task_priority: ["low", "normal", "high"],
      task_source: ["generated", "manual", "quick_add"],
      task_status: ["pending", "done", "skipped", "blocked"],
    },
  },
} as const

