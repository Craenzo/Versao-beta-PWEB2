import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Recebe o prompt do usuário e o modelo específico (ex: 'openai/gpt-4o-mini')
    const { prompt, model } = await request.json();

    if (!prompt || !model) {
      return NextResponse.json(
        { error: 'Prompt e modelo são obrigatórios.' },
        { status: 400 }
      );
    }

    // Faz a requisição segura para o OpenRouter usando a chave do .env.local
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000', // Requisito do OpenRouter
        'X-Title': 'Hub de IAs', // Requisito do OpenRouter
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 1500, // <-- REPARO AQUI: Limite de tokens para evitar bloqueio de saldo
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
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
    
    // Retorna a resposta da IA formatada para o frontend
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