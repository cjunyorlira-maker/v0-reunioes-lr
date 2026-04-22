import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// IDs das etapas no Kommo
const ETAPA_REMARCADOS = 102225923
const ETAPAS_PERMITIDAS = [67567420, 58498483, 102225923] // Confirmar reunião, Reunião confirmada, Remarcados

// IDs dos campos personalizados
const CAMPO_TIPO_REUNIAO_ID = 1026810
const CAMPO_DATA_REUNIAO_ID = 1025159

export async function POST() {
  try {
    const token = process.env.KOMMO_ACCESS_TOKEN
    const subdomain = process.env.KOMMO_SUBDOMAIN

    if (!token || !subdomain) {
      return NextResponse.json(
        { error: "Credenciais do Kommo não configuradas" },
        { status: 500 }
      )
    }

    // Criar cliente Supabase apenas dentro da função
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Busca todos os leads pendentes no banco
    const { data: leadsLocais, error: dbError } = await supabase
      .from("leads")
      .select("*")
      .eq("status", "pending")

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    if (!leadsLocais || leadsLocais.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "Nenhum lead pendente para sincronizar",
        updated: 0 
      })
    }

    let updated = 0
    let errors = 0
    const updates: string[] = []

    // Para cada lead local, verifica no Kommo se houve mudanças
    for (const leadLocal of leadsLocais) {
      try {
        const kommoLeadId = leadLocal.kommo_lead_id

        // Se não tem kommo_lead_id, pula esse lead (não busca por nome para evitar conflitos)
        if (!kommoLeadId) continue

        // Busca detalhes do lead no Kommo
        const response = await fetch(
          `https://${subdomain}.kommo.com/api/v4/leads/${kommoLeadId}?with=contacts`,
          {
            headers: { "Authorization": `Bearer ${token}` }
          }
        )

        if (!response.ok) continue

        const leadDetails = await response.json()
        
        // Verifica se está na etapa Remarcados
        const isRemarcado = leadDetails.status_id === ETAPA_REMARCADOS
        
        // Busca dados do responsável
        let responsavelNome = leadLocal.responsavel
        let equipe = leadLocal.equipe
        let fotoResponsavel = leadLocal.foto_responsavel
        
        if (leadDetails.responsible_user_id) {
          const userResponse = await fetch(
            `https://${subdomain}.kommo.com/api/v4/users/${leadDetails.responsible_user_id}`,
            {
              headers: { "Authorization": `Bearer ${token}` }
            }
          )
          
          if (userResponse.ok) {
            const user = await userResponse.json()
            responsavelNome = user.name || responsavelNome
            fotoResponsavel = user.avatar || fotoResponsavel
            equipe = user._embedded?.groups?.[0]?.name || equipe
          }
        }

        // Busca campos personalizados
        let tipoReuniao = leadLocal.tipo_reuniao
        let dataReuniao = leadLocal.data
        
        const customFields = leadDetails.custom_fields_values || []
        
        for (const field of customFields) {
          const fieldId = field.field_id
          const value = field.values?.[0]?.value
          
          if (fieldId === CAMPO_TIPO_REUNIAO_ID) {
            tipoReuniao = field.values?.[0]?.enum || value || tipoReuniao
          }
          
          if (fieldId === CAMPO_DATA_REUNIAO_ID) {
            if (value && typeof value === "number") {
              const date = new Date(value * 1000)
              dataReuniao = date.toISOString().split("T")[0]
            } else if (value && typeof value === "string" && value.match(/\d{4}-\d{2}-\d{2}/)) {
              dataReuniao = value.split("T")[0]
            }
          }
        }

        // Verifica se houve mudanças
        const mudouData = dataReuniao !== leadLocal.data
        const mudouRemarcado = isRemarcado && !leadLocal.remarcado
        const mudouResponsavel = responsavelNome !== leadLocal.responsavel
        
        if (mudouData || mudouRemarcado || mudouResponsavel) {
          // Atualiza o lead local
          const updateData: Record<string, unknown> = {
            kommo_lead_id: kommoLeadId,
            responsavel: responsavelNome,
            equipe: equipe,
            foto_responsavel: fotoResponsavel,
            tipo_reuniao: tipoReuniao,
          }
          
          if (mudouData) {
            updateData.data = dataReuniao
          }
          
          if (mudouRemarcado) {
            updateData.remarcado = true
            updateData.status = "pending"
          }

          const { error: updateError } = await supabase
            .from("leads")
            .update(updateData)
            .eq("id", leadLocal.id)

          if (!updateError) {
            updated++
            const changes = []
            if (mudouData) changes.push(`data: ${leadLocal.data} -> ${dataReuniao}`)
            if (mudouRemarcado) changes.push("remarcado")
            if (mudouResponsavel) changes.push(`responsável: ${responsavelNome}`)
            updates.push(`${leadLocal.nome}: ${changes.join(", ")}`)
          }
        }

        // Pequeno delay entre requisições para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 200))
        
      } catch (err) {
        console.error(`Erro ao sincronizar lead ${leadLocal.nome}:`, err)
        errors++
      }
    }

    return NextResponse.json({
      success: true,
      message: updated > 0 
        ? `${updated} lead(s) atualizado(s)` 
        : "Todos os leads estão atualizados",
      updated,
      errors,
      total: leadsLocais.length,
      updates,
    })

  } catch (error) {
    console.error("Erro na sincronização automática:", error)
    return NextResponse.json(
      { error: "Erro interno na sincronização" },
      { status: 500 }
    )
  }
}
