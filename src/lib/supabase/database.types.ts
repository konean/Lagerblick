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
      bewegungen: {
        Row: {
          art: Database["public"]["Enums"]["bewegungsart"]
          erstellt_am: string
          erstellt_von: string
          id: string
          kommentar: string | null
          material_id: string
          menge: number
          storno_von: string | null
        }
        Insert: {
          art: Database["public"]["Enums"]["bewegungsart"]
          erstellt_am?: string
          erstellt_von: string
          id?: string
          kommentar?: string | null
          material_id: string
          menge: number
          storno_von?: string | null
        }
        Update: {
          art?: Database["public"]["Enums"]["bewegungsart"]
          erstellt_am?: string
          erstellt_von?: string
          id?: string
          kommentar?: string | null
          material_id?: string
          menge?: number
          storno_von?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bewegungen_erstellt_von_fkey"
            columns: ["erstellt_von"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bewegungen_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "material_bestand"
            referencedColumns: ["material_id"]
          },
          {
            foreignKeyName: "bewegungen_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materialien"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bewegungen_storno_von_fkey"
            columns: ["storno_von"]
            isOneToOne: false
            referencedRelation: "bewegungen"
            referencedColumns: ["id"]
          },
        ]
      }
      kategorien: {
        Row: {
          erstellt_am: string
          id: string
          name: string
        }
        Insert: {
          erstellt_am?: string
          id?: string
          name: string
        }
        Update: {
          erstellt_am?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      materialien: {
        Row: {
          beschreibung: string | null
          einheit: Database["public"]["Enums"]["einheit"]
          erstellt_am: string
          geaendert_am: string
          hersteller: string
          id: string
          kategorie_id: string
          mindestbestand: number
          modell: string
          name: string
          sku: string | null
          status: Database["public"]["Enums"]["material_status"]
        }
        Insert: {
          beschreibung?: string | null
          einheit: Database["public"]["Enums"]["einheit"]
          erstellt_am?: string
          geaendert_am?: string
          hersteller: string
          id?: string
          kategorie_id: string
          mindestbestand?: number
          modell: string
          name: string
          sku?: string | null
          status?: Database["public"]["Enums"]["material_status"]
        }
        Update: {
          beschreibung?: string | null
          einheit?: Database["public"]["Enums"]["einheit"]
          erstellt_am?: string
          geaendert_am?: string
          hersteller?: string
          id?: string
          kategorie_id?: string
          mindestbestand?: number
          modell?: string
          name?: string
          sku?: string | null
          status?: Database["public"]["Enums"]["material_status"]
        }
        Relationships: [
          {
            foreignKeyName: "materialien_kategorie_id_fkey"
            columns: ["kategorie_id"]
            isOneToOne: false
            referencedRelation: "kategorien"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          anzeigename: string
          erstellt_am: string
          id: string
          rolle: Database["public"]["Enums"]["rolle"]
        }
        Insert: {
          anzeigename: string
          erstellt_am?: string
          id: string
          rolle?: Database["public"]["Enums"]["rolle"]
        }
        Update: {
          anzeigename?: string
          erstellt_am?: string
          id?: string
          rolle?: Database["public"]["Enums"]["rolle"]
        }
        Relationships: []
      }
    }
    Views: {
      material_bestand: {
        Row: {
          bestand: number | null
          material_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      buche_eingang: {
        Args: { p_kommentar?: string; p_material_id: string; p_menge: number }
        Returns: string
      }
      buche_entnahme: {
        Args: { p_kommentar?: string; p_material_id: string; p_menge: number }
        Returns: string
      }
      buche_korrektur: {
        Args: {
          p_gezaehlter_bestand: number
          p_kommentar: string
          p_material_id: string
        }
        Returns: string
      }
      buche_storno: {
        Args: { p_bewegung_id: string; p_kommentar: string }
        Returns: string
      }
      ist_admin: { Args: never; Returns: boolean }
      pruefe_menge: {
        Args: {
          p_einheit: Database["public"]["Enums"]["einheit"]
          p_menge: number
        }
        Returns: undefined
      }
    }
    Enums: {
      bewegungsart: "eingang" | "entnahme" | "korrektur" | "storno"
      einheit: "stueck" | "meter" | "rolle" | "packung" | "kg"
      material_status: "aktiv" | "archiviert"
      rolle: "admin" | "mitarbeiter"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      bewegungsart: ["eingang", "entnahme", "korrektur", "storno"],
      einheit: ["stueck", "meter", "rolle", "packung", "kg"],
      material_status: ["aktiv", "archiviert"],
      rolle: ["admin", "mitarbeiter"],
    },
  },
} as const
