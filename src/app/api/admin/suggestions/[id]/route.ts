import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/database';

async function applySuggestion(clientAccessToken: string, suggestion: any, action: any) {
  const campaignId = suggestion.campaignId;

  switch (action.type) {
    case 'pause': {
      const res = await fetch(`https://graph.facebook.com/v19.0/${campaignId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          effective_status: 'PAUSED',
          access_token: clientAccessToken,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      return data;
    }

    case 'resume': {
      const res = await fetch(`https://graph.facebook.com/v19.0/${campaignId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          effective_status: 'ACTIVE',
          access_token: clientAccessToken,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      return data;
    }

    case 'increase_budget':
    case 'decrease_budget': {
      const percent = action.parameters?.budget_change_percent || 20;

      const adSetRes = await fetch(
        `https://graph.facebook.com/v19.0/${campaignId}/adsets?fields=id,daily_budget,status&access_token=${clientAccessToken}&limit=100`
      );
      const adSetData = await adSetRes.json();

      if (adSetData.data && adSetData.data.length > 0) {
        for (const adSet of adSetData.data) {
          if (adSet.status === 'ACTIVE' || adSet.status === 'PAUSED') {
            const currentBudget = parseInt(adSet.daily_budget || '0');
            if (currentBudget > 0) {
              const newBudget = Math.max(100, Math.round(currentBudget * (1 + percent / 100)));

              const res = await fetch(`https://graph.facebook.com/v19.0/${adSet.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  daily_budget: newBudget.toString(),
                  access_token: clientAccessToken,
                }),
              });
              const data = await res.json();
              if (data.error) throw new Error(`Erro ao ajustar budget do adset ${adSet.id}: ${data.error.message}`);
            }
          }
        }
        return { success: true, message: `Budget ajustado em ${percent}%` };
      }

      throw new Error('Nenhum ad set ativo encontrado');
    }

    default:
      throw new Error(`Tipo de ação desconhecido: ${action.type}`);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { action, actionId } = await request.json();

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
    }

    const db = await getDb();
    if (!db.data?.suggestions) {
      return NextResponse.json({ error: 'Nenhuma sugestão encontrada' }, { status: 404 });
    }

    const suggestionIndex = db.data.suggestions.findIndex((s) => s.id === id);
    if (suggestionIndex === -1) {
      return NextResponse.json({ error: 'Sugestão não encontrada' }, { status: 404 });
    }

    const suggestion = db.data.suggestions[suggestionIndex];
    const client = db.data.clients?.find((c) => c.id === suggestion.clientId);

    if (!client) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    if (action === 'reject') {
      const targetActionId = actionId || suggestion.suggestions[0]?.id;
      const actionIdx = suggestion.suggestions.findIndex((a) => a.id === targetActionId);
      if (actionIdx !== -1) {
        suggestion.suggestions[actionIdx].status = 'rejected';
      }
      suggestion.status = 'rejected';
      await db.write();
      return NextResponse.json({ success: true, suggestion });
    }

    const targetActionId = actionId || suggestion.suggestions[0]?.id;
    const actionIdx = suggestion.suggestions.findIndex((a) => a.id === targetActionId);
    if (actionIdx === -1) {
      return NextResponse.json({ error: 'Ação não encontrada' }, { status: 404 });
    }

    const actionToApply = suggestion.suggestions[actionIdx];

    try {
      await applySuggestion(client.metaAdsAccessToken, suggestion, actionToApply);
      actionToApply.status = 'applied';
      actionToApply.appliedAt = new Date().toISOString();

      const allApplied = suggestion.suggestions.every((a: any) => a.status === 'applied');
      const allRejected = suggestion.suggestions.every((a: any) => a.status === 'rejected');

      if (allApplied) {
        suggestion.status = 'fully_applied';
      } else if (allRejected) {
        suggestion.status = 'rejected';
      } else {
        suggestion.status = 'partially_applied';
      }
    } catch (error: any) {
      actionToApply.status = 'failed';
      actionToApply.error = error.message;
    }

    await db.write();
    return NextResponse.json({ success: true, suggestion });
  } catch (error) {
    console.error('Erro ao processar sugestão:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}