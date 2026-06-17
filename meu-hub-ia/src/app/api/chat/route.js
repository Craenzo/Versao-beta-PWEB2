import { NextResponse } from 'next/server';

const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
  "qwen/qwen3-32b",
  "moonshotai/kimi-k2-instruct-0905",
];

const GEMINI_MODELS = [
  "gemini-2.5-flash",
];

const MISTRAL_MODELS = [
  "mistral-small-latest",
  "mistral-large-latest",
  "open-mistral-nemo",
  "codestral-latest",
];

async function callGroq(messages, model) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, max_tokens: 1500, messages }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Erro na API do Groq');
  }
  const data = await response.json();
  return data.choices[0].message.content;
}

async function callGemini(messages, model) {
  const contents = messages.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    }
  );
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Erro na API do Gemini');
  }
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

async function callMistral(messages, model) {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, max_tokens: 1500, messages }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Erro na API do Mistral');
  }
  const data = await response.json();
  return data.choices[0].message.content;
}

export async function POST(request) {
  try {
    const { messages, model } = await request.json();

    if (!messages || !model) {
      return NextResponse.json(
        { error: 'Mensagens e modelo são obrigatórios.' },
        { status: 400 }
      );
    }

    let text;
    if (GROQ_MODELS.includes(model)) {
      text = await callGroq(messages, model);
    } else if (GEMINI_MODELS.includes(model)) {
      text = await callGemini(messages, model);
    } else if (MISTRAL_MODELS.includes(model)) {
      text = await callMistral(messages, model);
    } else {
      return NextResponse.json({ error: 'Modelo não reconhecido.' }, { status: 400 });
    }

    return NextResponse.json({ text, model });

  } catch (error) {
    console.error('Erro no backend:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno no servidor do Hub.' },
      { status: 500 }
    );
  }
}
