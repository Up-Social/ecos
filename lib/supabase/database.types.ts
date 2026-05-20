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
      agentes: {
        Row: {
          created_at: string | null
          descripcion: string | null
          email: string | null
          external_id: string | null
          fuente_informacion: string | null
          grupos_poblacion: string[] | null
          id: string
          interconexiones_ids: string | null
          municipio_sede: string | null
          nombre: string
          personas_implicadas: number | null
          presupuesto: number | null
          rol_ecosistema: string[] | null
          sede_territorio_id: string | null
          tipo_agente: string | null
          updated_at: string | null
          web: string | null
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          email?: string | null
          external_id?: string | null
          fuente_informacion?: string | null
          grupos_poblacion?: string[] | null
          id?: string
          interconexiones_ids?: string | null
          municipio_sede?: string | null
          nombre: string
          personas_implicadas?: number | null
          presupuesto?: number | null
          rol_ecosistema?: string[] | null
          sede_territorio_id?: string | null
          tipo_agente?: string | null
          updated_at?: string | null
          web?: string | null
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          email?: string | null
          external_id?: string | null
          fuente_informacion?: string | null
          grupos_poblacion?: string[] | null
          id?: string
          interconexiones_ids?: string | null
          municipio_sede?: string | null
          nombre?: string
          personas_implicadas?: number | null
          presupuesto?: number | null
          rol_ecosistema?: string[] | null
          sede_territorio_id?: string | null
          tipo_agente?: string | null
          updated_at?: string | null
          web?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agentes_sede_territorio_id_fkey"
            columns: ["sede_territorio_id"]
            isOneToOne: false
            referencedRelation: "territorios"
            referencedColumns: ["id"]
          },
        ]
      }
      hallazgos: {
        Row: {
          created_at: string | null
          descripcion: string
          enlace: string | null
          estado_validacion: string | null
          evidencia_cuantitativa: string | null
          external_id: string | null
          fuente: string | null
          id: string
          innovacion_id: string
          nivel_evidencia: string | null
          titulo: string
          updated_at: string | null
          validado: boolean | null
        }
        Insert: {
          created_at?: string | null
          descripcion: string
          enlace?: string | null
          estado_validacion?: string | null
          evidencia_cuantitativa?: string | null
          external_id?: string | null
          fuente?: string | null
          id?: string
          innovacion_id: string
          nivel_evidencia?: string | null
          titulo: string
          updated_at?: string | null
          validado?: boolean | null
        }
        Update: {
          created_at?: string | null
          descripcion?: string
          enlace?: string | null
          estado_validacion?: string | null
          evidencia_cuantitativa?: string | null
          external_id?: string | null
          fuente?: string | null
          id?: string
          innovacion_id?: string
          nivel_evidencia?: string | null
          titulo?: string
          updated_at?: string | null
          validado?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "hallazgos_innovacion_id_fkey"
            columns: ["innovacion_id"]
            isOneToOne: false
            referencedRelation: "innovaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hallazgos_innovacion_id_fkey"
            columns: ["innovacion_id"]
            isOneToOne: false
            referencedRelation: "innovaciones_misiones"
            referencedColumns: ["innovacion_id"]
          },
          {
            foreignKeyName: "hallazgos_innovacion_id_fkey"
            columns: ["innovacion_id"]
            isOneToOne: false
            referencedRelation: "v_innovaciones_full"
            referencedColumns: ["id"]
          },
        ]
      }
      import_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          file_name: string | null
          id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          file_name?: string | null
          id?: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          file_name?: string | null
          id?: string
          status?: string | null
        }
        Relationships: []
      }
      innovaciones: {
        Row: {
          created_at: string | null
          descripcion: string | null
          enlace_referencia: string | null
          estado: string | null
          external_id: string | null
          grupos_poblacion: string[] | null
          id: string
          n_participantes: string | null
          nivel_impacto: string | null
          nombre: string
          opciones_escalado: string[] | null
          proyecto_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          enlace_referencia?: string | null
          estado?: string | null
          external_id?: string | null
          grupos_poblacion?: string[] | null
          id?: string
          n_participantes?: string | null
          nivel_impacto?: string | null
          nombre: string
          opciones_escalado?: string[] | null
          proyecto_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          enlace_referencia?: string | null
          estado?: string | null
          external_id?: string | null
          grupos_poblacion?: string[] | null
          id?: string
          n_participantes?: string | null
          nivel_impacto?: string | null
          nombre?: string
          opciones_escalado?: string[] | null
          proyecto_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "innovaciones_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "innovaciones_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos_misiones"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "innovaciones_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos_retos"
            referencedColumns: ["proyecto_id"]
          },
        ]
      }
      innovaciones_retos: {
        Row: {
          innovacion_id: string
          reto_id: string
        }
        Insert: {
          innovacion_id: string
          reto_id: string
        }
        Update: {
          innovacion_id?: string
          reto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "innovaciones_retos_innovacion_id_fkey"
            columns: ["innovacion_id"]
            isOneToOne: false
            referencedRelation: "innovaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "innovaciones_retos_innovacion_id_fkey"
            columns: ["innovacion_id"]
            isOneToOne: false
            referencedRelation: "innovaciones_misiones"
            referencedColumns: ["innovacion_id"]
          },
          {
            foreignKeyName: "innovaciones_retos_innovacion_id_fkey"
            columns: ["innovacion_id"]
            isOneToOne: false
            referencedRelation: "v_innovaciones_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "innovaciones_retos_reto_id_fkey"
            columns: ["reto_id"]
            isOneToOne: false
            referencedRelation: "proyectos_retos"
            referencedColumns: ["reto_id"]
          },
          {
            foreignKeyName: "innovaciones_retos_reto_id_fkey"
            columns: ["reto_id"]
            isOneToOne: false
            referencedRelation: "retos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "innovaciones_retos_reto_id_fkey"
            columns: ["reto_id"]
            isOneToOne: false
            referencedRelation: "v_cobertura_retos"
            referencedColumns: ["reto_id"]
          },
          {
            foreignKeyName: "innovaciones_retos_reto_id_fkey"
            columns: ["reto_id"]
            isOneToOne: false
            referencedRelation: "v_hallazgos_reto"
            referencedColumns: ["reto_id"]
          },
          {
            foreignKeyName: "innovaciones_retos_reto_id_fkey"
            columns: ["reto_id"]
            isOneToOne: false
            referencedRelation: "v_innovaciones_full"
            referencedColumns: ["reto_id"]
          },
          {
            foreignKeyName: "innovaciones_retos_reto_id_fkey"
            columns: ["reto_id"]
            isOneToOne: false
            referencedRelation: "v_retos_sin_innovacion"
            referencedColumns: ["reto_id"]
          },
        ]
      }
      insights_history: {
        Row: {
          created_at: string
          generated_by: string | null
          id: string
          insights: Json
          mision_id: string
          model: string | null
          resumen: string | null
          tokens_input: number | null
          tokens_output: number | null
        }
        Insert: {
          created_at?: string
          generated_by?: string | null
          id?: string
          insights?: Json
          mision_id: string
          model?: string | null
          resumen?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Update: {
          created_at?: string
          generated_by?: string | null
          id?: string
          insights?: Json
          mision_id?: string
          model?: string | null
          resumen?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "insights_history_mision_id_fkey"
            columns: ["mision_id"]
            isOneToOne: false
            referencedRelation: "innovaciones_misiones"
            referencedColumns: ["mision_id"]
          },
          {
            foreignKeyName: "insights_history_mision_id_fkey"
            columns: ["mision_id"]
            isOneToOne: false
            referencedRelation: "misiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insights_history_mision_id_fkey"
            columns: ["mision_id"]
            isOneToOne: false
            referencedRelation: "proyectos_misiones"
            referencedColumns: ["mision_id"]
          },
          {
            foreignKeyName: "insights_history_mision_id_fkey"
            columns: ["mision_id"]
            isOneToOne: false
            referencedRelation: "v_agentes_mision"
            referencedColumns: ["mision_id"]
          },
          {
            foreignKeyName: "insights_history_mision_id_fkey"
            columns: ["mision_id"]
            isOneToOne: false
            referencedRelation: "v_cartera_innovacion"
            referencedColumns: ["mision_id"]
          },
          {
            foreignKeyName: "insights_history_mision_id_fkey"
            columns: ["mision_id"]
            isOneToOne: false
            referencedRelation: "v_cobertura_retos"
            referencedColumns: ["mision_id"]
          },
          {
            foreignKeyName: "insights_history_mision_id_fkey"
            columns: ["mision_id"]
            isOneToOne: false
            referencedRelation: "v_hallazgos_reto"
            referencedColumns: ["mision_id"]
          },
          {
            foreignKeyName: "insights_history_mision_id_fkey"
            columns: ["mision_id"]
            isOneToOne: false
            referencedRelation: "v_innovaciones_full"
            referencedColumns: ["mision_id"]
          },
          {
            foreignKeyName: "insights_history_mision_id_fkey"
            columns: ["mision_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_mision"
            referencedColumns: ["mision_id"]
          },
          {
            foreignKeyName: "insights_history_mision_id_fkey"
            columns: ["mision_id"]
            isOneToOne: false
            referencedRelation: "v_nivel_evidencia_mision"
            referencedColumns: ["mision_id"]
          },
          {
            foreignKeyName: "insights_history_mision_id_fkey"
            columns: ["mision_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_madurez"
            referencedColumns: ["mision_id"]
          },
          {
            foreignKeyName: "insights_history_mision_id_fkey"
            columns: ["mision_id"]
            isOneToOne: false
            referencedRelation: "v_recomendaciones_mision"
            referencedColumns: ["mision_id"]
          },
          {
            foreignKeyName: "insights_history_mision_id_fkey"
            columns: ["mision_id"]
            isOneToOne: false
            referencedRelation: "v_retos_sin_innovacion"
            referencedColumns: ["mision_id"]
          },
        ]
      }
      misiones: {
        Row: {
          created_at: string | null
          descripcion: string | null
          external_id: string | null
          fuente_informacion: string | null
          id: string
          nombre: string
          notas_internas: string | null
          problema: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          external_id?: string | null
          fuente_informacion?: string | null
          id?: string
          nombre: string
          notas_internas?: string | null
          problema?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          external_id?: string | null
          fuente_informacion?: string | null
          id?: string
          nombre?: string
          notas_internas?: string | null
          problema?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      proyectos: {
        Row: {
          agente_lider_id: string
          ccaa: string | null
          created_at: string | null
          descripcion: string | null
          enlace_1: string | null
          estado: string | null
          external_id: string | null
          fecha_fin: string | null
          fecha_inicio: string | null
          financiador: string | null
          grupos_poblacion: string[] | null
          id: string
          nombre: string
          presupuesto: number | null
          updated_at: string | null
        }
        Insert: {
          agente_lider_id: string
          ccaa?: string | null
          created_at?: string | null
          descripcion?: string | null
          enlace_1?: string | null
          estado?: string | null
          external_id?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          financiador?: string | null
          grupos_poblacion?: string[] | null
          id?: string
          nombre: string
          presupuesto?: number | null
          updated_at?: string | null
        }
        Update: {
          agente_lider_id?: string
          ccaa?: string | null
          created_at?: string | null
          descripcion?: string | null
          enlace_1?: string | null
          estado?: string | null
          external_id?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          financiador?: string | null
          grupos_poblacion?: string[] | null
          id?: string
          nombre?: string
          presupuesto?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proyectos_agente_lider_id_fkey"
            columns: ["agente_lider_id"]
            isOneToOne: false
            referencedRelation: "agentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyectos_agente_lider_id_fkey"
            columns: ["agente_lider_id"]
            isOneToOne: false
            referencedRelation: "v_agentes_mision"
            referencedColumns: ["agente_id"]
          },
        ]
      }
      proyectos_agentes: {
        Row: {
          agente_id: string
          proyecto_id: string
        }
        Insert: {
          agente_id: string
          proyecto_id: string
        }
        Update: {
          agente_id?: string
          proyecto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proyectos_agentes_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "agentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyectos_agentes_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "v_agentes_mision"
            referencedColumns: ["agente_id"]
          },
          {
            foreignKeyName: "proyectos_agentes_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyectos_agentes_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos_misiones"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "proyectos_agentes_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos_retos"
            referencedColumns: ["proyecto_id"]
          },
        ]
      }
      recomendaciones: {
        Row: {
          alcance: string | null
          ambito: string[] | null
          created_at: string | null
          descripcion: string
          destinatarios: string | null
          estado: string | null
          external_id: string | null
          id: string
          titulo: string
          updated_at: string | null
        }
        Insert: {
          alcance?: string | null
          ambito?: string[] | null
          created_at?: string | null
          descripcion: string
          destinatarios?: string | null
          estado?: string | null
          external_id?: string | null
          id?: string
          titulo: string
          updated_at?: string | null
        }
        Update: {
          alcance?: string | null
          ambito?: string[] | null
          created_at?: string | null
          descripcion?: string
          destinatarios?: string | null
          estado?: string | null
          external_id?: string | null
          id?: string
          titulo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      recomendaciones_hallazgos: {
        Row: {
          hallazgo_id: string
          recomendacion_id: string
        }
        Insert: {
          hallazgo_id: string
          recomendacion_id: string
        }
        Update: {
          hallazgo_id?: string
          recomendacion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recomendaciones_hallazgos_hallazgo_id_fkey"
            columns: ["hallazgo_id"]
            isOneToOne: false
            referencedRelation: "hallazgos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recomendaciones_hallazgos_hallazgo_id_fkey"
            columns: ["hallazgo_id"]
            isOneToOne: false
            referencedRelation: "v_hallazgos_reto"
            referencedColumns: ["hallazgo_id"]
          },
          {
            foreignKeyName: "recomendaciones_hallazgos_recomendacion_id_fkey"
            columns: ["recomendacion_id"]
            isOneToOne: false
            referencedRelation: "recomendaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recomendaciones_hallazgos_recomendacion_id_fkey"
            columns: ["recomendacion_id"]
            isOneToOne: false
            referencedRelation: "v_recomendaciones_mision"
            referencedColumns: ["id"]
          },
        ]
      }
      retos: {
        Row: {
          created_at: string | null
          descripcion: string | null
          external_id: string | null
          fuente_informacion: string | null
          id: string
          nombre: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          external_id?: string | null
          fuente_informacion?: string | null
          id?: string
          nombre: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          external_id?: string | null
          fuente_informacion?: string | null
          id?: string
          nombre?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      retos_misiones: {
        Row: {
          mision_id: string
          reto_id: string
        }
        Insert: {
          mision_id: string
          reto_id: string
        }
        Update: {
          mision_id?: string
          reto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "retos_misiones_mision_id_fkey"
            columns: ["mision_id"]
            isOneToOne: false
            referencedRelation: "innovaciones_misiones"
            referencedColumns: ["mision_id"]
          },
          {
            foreignKeyName: "retos_misiones_mision_id_fkey"
            columns: ["mision_id"]
            isOneToOne: false
            referencedRelation: "misiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retos_misiones_mision_id_fkey"
            columns: ["mision_id"]
            isOneToOne: false
            referencedRelation: "proyectos_misiones"
            referencedColumns: ["mision_id"]
          },
          {
            foreignKeyName: "retos_misiones_mision_id_fkey"
            columns: ["mision_id"]
            isOneToOne: false
            referencedRelation: "v_agentes_mision"
            referencedColumns: ["mision_id"]
          },
          {
            foreignKeyName: "retos_misiones_mision_id_fkey"
            columns: ["mision_id"]
            isOneToOne: false
            referencedRelation: "v_cartera_innovacion"
            referencedColumns: ["mision_id"]
          },
          {
            foreignKeyName: "retos_misiones_mision_id_fkey"
            columns: ["mision_id"]
            isOneToOne: false
            referencedRelation: "v_cobertura_retos"
            referencedColumns: ["mision_id"]
          },
          {
            foreignKeyName: "retos_misiones_mision_id_fkey"
            columns: ["mision_id"]
            isOneToOne: false
            referencedRelation: "v_hallazgos_reto"
            referencedColumns: ["mision_id"]
          },
          {
            foreignKeyName: "retos_misiones_mision_id_fkey"
            columns: ["mision_id"]
            isOneToOne: false
            referencedRelation: "v_innovaciones_full"
            referencedColumns: ["mision_id"]
          },
          {
            foreignKeyName: "retos_misiones_mision_id_fkey"
            columns: ["mision_id"]
            isOneToOne: false
            referencedRelation: "v_kpis_mision"
            referencedColumns: ["mision_id"]
          },
          {
            foreignKeyName: "retos_misiones_mision_id_fkey"
            columns: ["mision_id"]
            isOneToOne: false
            referencedRelation: "v_nivel_evidencia_mision"
            referencedColumns: ["mision_id"]
          },
          {
            foreignKeyName: "retos_misiones_mision_id_fkey"
            columns: ["mision_id"]
            isOneToOne: false
            referencedRelation: "v_pipeline_madurez"
            referencedColumns: ["mision_id"]
          },
          {
            foreignKeyName: "retos_misiones_mision_id_fkey"
            columns: ["mision_id"]
            isOneToOne: false
            referencedRelation: "v_recomendaciones_mision"
            referencedColumns: ["mision_id"]
          },
          {
            foreignKeyName: "retos_misiones_mision_id_fkey"
            columns: ["mision_id"]
            isOneToOne: false
            referencedRelation: "v_retos_sin_innovacion"
            referencedColumns: ["mision_id"]
          },
          {
            foreignKeyName: "retos_misiones_reto_id_fkey"
            columns: ["reto_id"]
            isOneToOne: false
            referencedRelation: "proyectos_retos"
            referencedColumns: ["reto_id"]
          },
          {
            foreignKeyName: "retos_misiones_reto_id_fkey"
            columns: ["reto_id"]
            isOneToOne: false
            referencedRelation: "retos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retos_misiones_reto_id_fkey"
            columns: ["reto_id"]
            isOneToOne: false
            referencedRelation: "v_cobertura_retos"
            referencedColumns: ["reto_id"]
          },
          {
            foreignKeyName: "retos_misiones_reto_id_fkey"
            columns: ["reto_id"]
            isOneToOne: false
            referencedRelation: "v_hallazgos_reto"
            referencedColumns: ["reto_id"]
          },
          {
            foreignKeyName: "retos_misiones_reto_id_fkey"
            columns: ["reto_id"]
            isOneToOne: false
            referencedRelation: "v_innovaciones_full"
            referencedColumns: ["reto_id"]
          },
          {
            foreignKeyName: "retos_misiones_reto_id_fkey"
            columns: ["reto_id"]
            isOneToOne: false
            referencedRelation: "v_retos_sin_innovacion"
            referencedColumns: ["reto_id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          key: string
          label: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          key: string
          label: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          key?: string
          label?: string
        }
        Relationships: []
      }
      territorios: {
        Row: {
          created_at: string | null
          id: string
          nombre: string
          parent_id: string | null
          tipo: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nombre: string
          parent_id?: string | null
          tipo: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nombre?: string
          parent_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "territorios_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "territorios"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          apellidos: string | null
          created_at: string | null
          disabled: boolean
          email: string | null
          id: string
          nombre: string | null
          updated_at: string | null
        }
        Insert: {
          apellidos?: string | null
          created_at?: string | null
          disabled?: boolean
          email?: string | null
          id: string
          nombre?: string | null
          updated_at?: string | null
        }
        Update: {
          apellidos?: string | null
          created_at?: string | null
          disabled?: boolean
          email?: string | null
          id?: string
          nombre?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          role_key: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          role_key: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          role_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_key_fkey"
            columns: ["role_key"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "user_roles_user_id_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      innovaciones_misiones: {
        Row: {
          innovacion_id: string | null
          mision_id: string | null
          mision_nombre: string | null
        }
        Relationships: []
      }
      proyectos_misiones: {
        Row: {
          mision_id: string | null
          mision_nombre: string | null
          proyecto_id: string | null
        }
        Relationships: []
      }
      proyectos_retos: {
        Row: {
          proyecto_id: string | null
          reto_id: string | null
          reto_nombre: string | null
        }
        Relationships: []
      }
      v_agentes_mision: {
        Row: {
          agente_id: string | null
          mision_id: string | null
          nombre: string | null
          total_proyectos: number | null
        }
        Relationships: []
      }
      v_cartera_innovacion: {
        Row: {
          estado: string | null
          mision_id: string | null
          nivel_impacto: string | null
          total: number | null
        }
        Relationships: []
      }
      v_cobertura_retos: {
        Row: {
          mision_id: string | null
          reto_id: string | null
          reto_nombre: string | null
          total_innovaciones: number | null
        }
        Relationships: []
      }
      v_hallazgos_reto: {
        Row: {
          hallazgo_id: string | null
          mision_id: string | null
          nivel_evidencia: string | null
          reto_id: string | null
          reto_nombre: string | null
          titulo: string | null
        }
        Relationships: []
      }
      v_innovaciones_full: {
        Row: {
          agente_lider_id: string | null
          agente_nombre: string | null
          estado: string | null
          id: string | null
          mision_id: string | null
          mision_nombre: string | null
          nivel_impacto: string | null
          nombre: string | null
          proyecto_id: string | null
          proyecto_nombre: string | null
          reto_id: string | null
          reto_nombre: string | null
        }
        Relationships: [
          {
            foreignKeyName: "innovaciones_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "innovaciones_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos_misiones"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "innovaciones_proyecto_id_fkey"
            columns: ["proyecto_id"]
            isOneToOne: false
            referencedRelation: "proyectos_retos"
            referencedColumns: ["proyecto_id"]
          },
          {
            foreignKeyName: "proyectos_agente_lider_id_fkey"
            columns: ["agente_lider_id"]
            isOneToOne: false
            referencedRelation: "agentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proyectos_agente_lider_id_fkey"
            columns: ["agente_lider_id"]
            isOneToOne: false
            referencedRelation: "v_agentes_mision"
            referencedColumns: ["agente_id"]
          },
        ]
      }
      v_kpis_mision: {
        Row: {
          mision_id: string | null
          mision_nombre: string | null
          total_agentes: number | null
          total_hallazgos: number | null
          total_innovaciones: number | null
          total_proyectos: number | null
          total_recomendaciones: number | null
          total_retos: number | null
        }
        Relationships: []
      }
      v_nivel_evidencia_mision: {
        Row: {
          mision_id: string | null
          nivel_evidencia: string | null
          total: number | null
        }
        Relationships: []
      }
      v_pipeline_madurez: {
        Row: {
          estado: string | null
          mision_id: string | null
          total: number | null
        }
        Relationships: []
      }
      v_recomendaciones_mision: {
        Row: {
          alcance: string | null
          estado: string | null
          id: string | null
          mision_id: string | null
          titulo: string | null
        }
        Relationships: []
      }
      v_retos_sin_innovacion: {
        Row: {
          mision_id: string | null
          reto_id: string | null
          reto_nombre: string | null
          total_innovaciones: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_panel_user: { Args: never; Returns: boolean }
      is_superadmin: { Args: never; Returns: boolean }
      user_has_role: { Args: { rkey: string; uid: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
