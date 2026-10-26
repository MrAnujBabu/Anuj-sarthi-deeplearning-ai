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
      agent_settings: {
        Row: {
          brain: string
          default_mode: string
          id: string
          quiz_timer_seconds: number
          updated_at: string
        }
        Insert: {
          brain?: string
          default_mode?: string
          id?: string
          quiz_timer_seconds?: number
          updated_at?: string
        }
        Update: {
          brain?: string
          default_mode?: string
          id?: string
          quiz_timer_seconds?: number
          updated_at?: string
        }
        Relationships: []
      }
      ai_pause_state: {
        Row: {
          id: string
          kind: string
          message: string
          updated_at: string
        }
        Insert: {
          id: string
          kind: string
          message: string
          updated_at?: string
        }
        Update: {
          id?: string
          kind?: string
          message?: string
          updated_at?: string
        }
        Relationships: []
      }
      memory_items: {
        Row: {
          active: boolean
          category: string
          chapter: string
          content: string
          created_at: string
          file_path: string | null
          frequency: number
          id: string
          kind: string
          mime: string | null
          source_url: string | null
          subject: string
          title: string
          tracker_type: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string
          chapter?: string
          content?: string
          created_at?: string
          file_path?: string | null
          frequency?: number
          id?: string
          kind: string
          mime?: string | null
          source_url?: string | null
          subject?: string
          title: string
          tracker_type?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          chapter?: string
          content?: string
          created_at?: string
          file_path?: string | null
          frequency?: number
          id?: string
          kind?: string
          mime?: string | null
          source_url?: string | null
          subject?: string
          title?: string
          tracker_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ncert_snippets: {
        Row: {
          chapter_key: string
          content: string
          created_at: string
          id: string
          source_url: string | null
          topic: string
          verified: boolean
        }
        Insert: {
          chapter_key: string
          content: string
          created_at?: string
          id?: string
          source_url?: string | null
          topic: string
          verified?: boolean
        }
        Update: {
          chapter_key?: string
          content?: string
          created_at?: string
          id?: string
          source_url?: string | null
          topic?: string
          verified?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          display_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vedantu_class_notes: {
        Row: {
          created_at: string
          fetched_at: string
          markdown: string
          sections: number
          session_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fetched_at?: string
          markdown?: string
          sections?: number
          session_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fetched_at?: string
          markdown?: string
          sections?: number
          session_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      vedantu_classes: {
        Row: {
          attended_seconds: number
          batch_id: string
          chapter: string
          created_at: string
          description: string
          ends_at: string | null
          enrollment_id: string
          has_notes_pdf: boolean
          has_smart_notes: boolean
          session_id: string
          starts_at: string | null
          subject: string
          teacher: string
          title: string
          updated_at: string
        }
        Insert: {
          attended_seconds?: number
          batch_id?: string
          chapter?: string
          created_at?: string
          description?: string
          ends_at?: string | null
          enrollment_id: string
          has_notes_pdf?: boolean
          has_smart_notes?: boolean
          session_id: string
          starts_at?: string | null
          subject?: string
          teacher?: string
          title?: string
          updated_at?: string
        }
        Update: {
          attended_seconds?: number
          batch_id?: string
          chapter?: string
          created_at?: string
          description?: string
          ends_at?: string | null
          enrollment_id?: string
          has_notes_pdf?: boolean
          has_smart_notes?: boolean
          session_id?: string
          starts_at?: string | null
          subject?: string
          teacher?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vedantu_classes_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "vedantu_courses"
            referencedColumns: ["enrollment_id"]
          },
        ]
      }
      vedantu_courses: {
        Row: {
          banner_url: string | null
          batches: Json
          bundle_id: string
          classroom_id: string
          course_type: string
          created_at: string
          enrollment_id: string
          language: string
          last_accessed_at: string | null
          stats: Json
          status: string
          synced_at: string | null
          title: string
          updated_at: string
          valid_till: string | null
        }
        Insert: {
          banner_url?: string | null
          batches?: Json
          bundle_id: string
          classroom_id: string
          course_type?: string
          created_at?: string
          enrollment_id: string
          language?: string
          last_accessed_at?: string | null
          stats?: Json
          status?: string
          synced_at?: string | null
          title: string
          updated_at?: string
          valid_till?: string | null
        }
        Update: {
          banner_url?: string | null
          batches?: Json
          bundle_id?: string
          classroom_id?: string
          course_type?: string
          created_at?: string
          enrollment_id?: string
          language?: string
          last_accessed_at?: string | null
          stats?: Json
          status?: string
          synced_at?: string | null
          title?: string
          updated_at?: string
          valid_till?: string | null
        }
        Relationships: []
      }
      vedantu_sync_state: {
        Row: {
          counts: Json
          created_at: string
          finished_at: string | null
          id: string
          lease_id: string | null
          lease_until: string | null
          message: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          counts?: Json
          created_at?: string
          finished_at?: string | null
          id?: string
          lease_id?: string | null
          lease_until?: string | null
          message?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          counts?: Json
          created_at?: string
          finished_at?: string | null
          id?: string
          lease_id?: string | null
          lease_until?: string | null
          message?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      vedantu_tests: {
        Row: {
          attempted_at: string | null
          closes_at: string | null
          content_id: string
          content_state: string
          created_at: string
          duration_minutes: number | null
          enrollment_id: string
          marks: number | null
          opens_at: string | null
          questions: number | null
          result_at: string | null
          result_url: string | null
          series: string
          status: string
          subjects: string[]
          test_id: string
          test_url: string | null
          title: string
          total_marks: number | null
          updated_at: string
        }
        Insert: {
          attempted_at?: string | null
          closes_at?: string | null
          content_id: string
          content_state?: string
          created_at?: string
          duration_minutes?: number | null
          enrollment_id: string
          marks?: number | null
          opens_at?: string | null
          questions?: number | null
          result_at?: string | null
          result_url?: string | null
          series?: string
          status?: string
          subjects?: string[]
          test_id?: string
          test_url?: string | null
          title?: string
          total_marks?: number | null
          updated_at?: string
        }
        Update: {
          attempted_at?: string | null
          closes_at?: string | null
          content_id?: string
          content_state?: string
          created_at?: string
          duration_minutes?: number | null
          enrollment_id?: string
          marks?: number | null
          opens_at?: string | null
          questions?: number | null
          result_at?: string | null
          result_url?: string | null
          series?: string
          status?: string
          subjects?: string[]
          test_id?: string
          test_url?: string | null
          title?: string
          total_marks?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vedantu_tests_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "vedantu_courses"
            referencedColumns: ["enrollment_id"]
          },
        ]
      }
      voice_calls: {
        Row: {
          accent: string
          answer_count: number
          confirmed_seconds: number | null
          created_at: string
          credit_total: number | null
          documents: Json
          ended_at: string | null
          finalized: boolean
          id: string
          last_error: string | null
          quiz: boolean
          search: boolean
          search_count: number
          session_id: string | null
          status: string
          updated_at: string
          voice: string
        }
        Insert: {
          accent?: string
          answer_count?: number
          confirmed_seconds?: number | null
          created_at?: string
          credit_total?: number | null
          documents?: Json
          ended_at?: string | null
          finalized?: boolean
          id: string
          last_error?: string | null
          quiz?: boolean
          search?: boolean
          search_count?: number
          session_id?: string | null
          status?: string
          updated_at?: string
          voice?: string
        }
        Update: {
          accent?: string
          answer_count?: number
          confirmed_seconds?: number | null
          created_at?: string
          credit_total?: number | null
          documents?: Json
          ended_at?: string | null
          finalized?: boolean
          id?: string
          last_error?: string | null
          quiz?: boolean
          search?: boolean
          search_count?: number
          session_id?: string | null
          status?: string
          updated_at?: string
          voice?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
