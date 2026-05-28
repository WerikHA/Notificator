import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { accessToken, accountId } = await request.json();

    if (!accessToken || !accountId) {
      return NextResponse.json(
        { error: 'Token e ID da conta são obrigatórios' },
        { status: 400 }
      );
    }

    const formattedId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;

    const response = await fetch(
      `https://graph.facebook.com/v19.0/${formattedId}?fields=name,account_id,currency,amount_spent,balance,spend_cap,remaining_amount&access_token=${encodeURIComponent(accessToken)}`
    );

    const data = await response.json();

    if (data.error) {
      return NextResponse.json(
        { error: data.error.message || 'Erro ao buscar saldo' },
        { status: 400 }
      );
    }

    // Valores da API vêm em centavos, dividimos por 100
    const amountSpent = data.amount_spent ? parseInt(data.amount_spent) / 100 : 0;
    const spendCap = data.spend_cap ? parseInt(data.spend_cap) / 100 : 0;
    const remainingAmount = data.remaining_amount ? parseInt(data.remaining_amount) / 100 : null;
    const balance = data.balance ? parseInt(data.balance) / 100 : 0;

    // Se remaining_amount estiver disponível, usamos ele como saldo disponível
    // Senão, calculamos: spend_cap - amount_spent (se spend_cap existir)
    let availableBalance = null;
    if (remainingAmount !== null && remainingAmount !== undefined) {
      availableBalance = remainingAmount;
    } else if (spendCap > 0) {
      availableBalance = Math.max(0, spendCap - amountSpent);
    }

    return NextResponse.json({
      name: data.name,
      accountId: data.account_id,
      currency: data.currency || 'BRL',
      amountSpent,
      balance,
      spendCap,
      availableBalance,
      hasLimit: spendCap > 0,
    });
  } catch (error) {
    console.error('Erro ao buscar saldo:', error);
    return NextResponse.json(
      { error: 'Erro ao conectar com a API do Meta' },
      { status: 500 }
    );
  }
}