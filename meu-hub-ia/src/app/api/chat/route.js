import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Agora o backend recebe o array completo de mensagens do histórico
    const { messages, model } = await request.json();

    if (!messages || !model) {
      return NextResponse.json(
        { error: 'Mensagens e modelo são obrigatórios.' },
        { status: 400 }
      );
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Hub de IAs',
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 1500,
        messages: messages, // Injeta o histórico completo na API
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error?.message || 'Erro na API do OpenRouter' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      text: data.choices[0].message.content,
      model: model
    });

  } catch (error) {
    console.error('Erro no backend:', error);
    return NextResponse.json(
      { error: 'Erro interno no servidor do Hub.' },
      { status: 500 }
    );
  }
}