"use client";

import { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Send, Loader2, Bot, Menu, User, X, CheckSquare, Square, LogOut, Download } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Estados de Autenticação
  const [user, setUser] = useState(null);
  const [activeChatId, setActiveChatId] = useState(null);
  const [historicoChats, setHistoricoChats] = useState([]);

  // Controle de quais IAs estão ativas na tela
  const [iasAtivas, setIasAtivas] = useState({
    chatgpt: true,
    gemini: true,
    grok: true
  });
  
  const [respostas, setRespostas] = useState({
    chatgpt: "",
    gemini: "",
    grok: ""
  });

  const modelos = [
    { id: "chatgpt", nome: "ChatGPT", modeloApi: "openai/gpt-4o-mini", cor: "text-emerald-400" },
    { id: "gemini", nome: "Gemini", modeloApi: "google/gemini-2.5-flash", cor: "text-blue-400" },
    { id: "grok", nome: "Grok", modeloApi: "x-ai/grok-4.3", cor: "text-red-400" }
  ];

  // 1. Monitorar se o usuário está logado
  useEffect(() => {
    const obterSessao = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    obterSessao();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Buscar a lista de chats salvos do usuário logado
  const carregarListaChats = useCallback(async (userId) => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("chats")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    
    if (!error && data) setHistoricoChats(data);
  }, []);

  useEffect(() => {
    if (user) carregarListaChats(user.id);
    else {
      setHistoricoChats([]);
      setActiveChatId(null);
    }
  }, [user, carregarListaChats]);

  // 3. Carregar mensagens de um chat selecionado no histórico
  const carregarMensagensDoChat = async (chatId) => {
    setActiveChatId(chatId);
    setIsSidebarOpen(false);
    setRespostas({ chatgpt: "", gemini: "", grok: "" });

    const { data, error } = await supabase
      .from("mensagens")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      const novasRespostas = { chatgpt: "", gemini: "", grok: "" };
      data.forEach((msg) => {
        if (msg.ia_id !== "user") {
          novasRespostas[msg.ia_id] = msg.conteudo;
        }
      });
      setRespostas(novasRespostas);
    }
  };

  const toggleIa = (id) => {
    setIasAtivas(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // 4. Lógica de Envio do Prompt + Salvamento no Banco
  const enviarPrompt = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    const promptAtual = prompt;
    setPrompt(""); // Limpa o campo de digitação de imediato
    setRespostas({ chatgpt: "", gemini: "", grok: "" });

    let chatId = activeChatId;

    // Se o usuário estiver logado e for um chat novo, cria a sessão de chat primeiro
    if (user && !chatId) {
      const tituloGerado = promptAtual.length > 25 ? promptAtual.substring(0, 25) + "..." : promptAtual;
      const { data: novoChat, error: erroChat } = await supabase
        .from("chats")
        .insert([{ user_id: user.id, titulo: tituloGerado }])
        .select()
        .single();

      if (!erroChat && novoChat) {
        chatId = novoChat.id;
        setActiveChatId(chatId);
        carregarListaChats(user.id);
      }
    }

    // Se o chat foi criado/existe, salva o prompt do usuário
    if (user && chatId) {
      await supabase.from("mensagens").insert([
        { chat_id: chatId, ia_id: "user", conteudo: promptAtual }
      ]);
    }

    const modelosAtivos = modelos.filter(ia => iasAtivas[ia.id]);

    const promessas = modelosAtivos.map(async (ia) => {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: promptAtual, model: ia.modeloApi }),
        });
        
        const data = await res.json();
        const respostaTexto = data.text || data.error || "Erro ao gerar resposta.";
        
        setRespostas((prev) => ({
          ...prev,
          [ia.id]: respostaTexto
        }));

        // Salva a resposta da respectiva IA no banco de dados
        if (user && chatId) {
          await supabase.from("mensagens").insert([
            { chat_id: chatId, ia_id: ia.id, conteudo: respostaTexto }
          ]);
        }
      } catch (error) {
        setRespostas((prev) => ({
          ...prev,
          [ia.id]: "Falha na conexão com a API."
        }));
      }
    });

    await Promise.all(promessas);
    setLoading(false);
  };

  // 5. Função para Exportar Conversa em Markdown (Ideia 5)
  const exportarParaMarkdown = (id, nomeIa) => {
    const conteudo = respostas[id];
    if (!conteudo) return;

    const textoMarkdown = `# Histórico de Resposta - ${nomeIa}\n\n${conteudo}`;
    const blob = new Blob([textoMarkdown], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `resposta_${id}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setActiveChatId(null);
    setRespostas({ chatgpt: "", gemini: "", grok: "" });
  };

  const qtdAtivas = Object.values(iasAtivas).filter(Boolean).length;
  const gridCols = qtdAtivas === 1 ? "grid-cols-1" : qtdAtivas === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-3";

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      
      {/* 1. BARRA SUPERIOR (HEADER) */}
      <header className="px-4 py-3 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between z-10 shadow-md">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-zinc-800 rounded-md transition-colors text-zinc-300">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <Bot className="text-green-400 w-8 h-8" />
            <h1 className="text-xl font-bold tracking-wider hidden sm:block">HUB DE <span className="text-green-400">IAS</span></h1>
          </div>
          {activeChatId && (
            <button onClick={() => { setActiveChatId(null); setRespostas({ chatgpt: "", gemini: "", grok: "" }); }} className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded-md text-zinc-400 hover:text-zinc-200 transition-colors">
              + Novo Chat
            </button>
          )}
        </div>
        
        {/* Lógica Dinâmica do Botão de Login / Usuário */}
        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 hidden md:inline max-w-[150px] truncate">{user.email}</span>
            <button onClick={handleLogout} className="flex items-center gap-2 bg-red-950/40 hover:bg-red-900/40 border border-red-900/30 text-red-400 px-4 py-2 rounded-full transition-colors text-sm font-semibold">
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </button>
          </div>
        ) : (
          <button onClick={() => router.push("/login")} className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-full transition-colors border border-zinc-700 shadow-sm">
            <User className="w-4 h-4 text-green-400" />
            <span className="text-sm font-semibold tracking-wide">Login</span>
          </button>
        )}
      </header>

      {/* 2. MENU LATERAL (SIDEBAR COM HISTÓRICO E SELEÇÃO) */}
      {isSidebarOpen && (
        <div className="absolute inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)}></div>
          
          <div className="relative w-80 bg-zinc-900 border-r border-zinc-800 h-full p-6 shadow-2xl flex flex-col">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-800">
              <h2 className="text-lg font-bold tracking-wide">Painel de Controle</h2>
              <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-md transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Seleção de Modelos */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Modelos na Tela</h3>
              <div className="flex flex-col gap-2">
                {modelos.map(ia => (
                  <button 
                    key={ia.id}
                    onClick={() => toggleIa(ia.id)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800/60 bg-zinc-950/40 hover:bg-zinc-800 transition-all text-left group text-sm"
                  >
                    {iasAtivas[ia.id] ? <CheckSquare className="text-green-400 w-4 h-4 flex-shrink-0" /> : <Square className="text-zinc-600 group-hover:text-zinc-400 w-4 h-4 flex-shrink-0" />}
                    <span className={`font-medium ${ia.cor}`}>{ia.nome}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Histórico de Conversas salvas no Banco */}
            <div className="flex-1 overflow-y-auto border-t border-zinc-800/80 pt-4 flex flex-col">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Histórico de Conversas</h3>
              {!user ? (
                <p className="text-xs text-zinc-600 italic text-center my-4">Faça login para salvar e ver o histórico de conversas.</p>
              ) : historicoChats.length === 0 ? (
                <p className="text-xs text-zinc-600 italic text-center my-4">Nenhum chat salvo ainda.</p>
              ) : (
                <div className="flex flex-col gap-1.5 overflow-y-auto pr-1 flex-1">
                  {historicoChats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => carregarMensagensDoChat(chat.id)}
                      className={`text-left p-3 rounded-xl text-sm transition-all truncate border ${activeChatId === chat.id ? "bg-green-500/10 border-green-500/30 text-green-400 font-medium" : "bg-zinc-950/20 border-transparent hover:bg-zinc-800/50 text-zinc-400"}`}
                    >
                      {chat.titulo}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. ÁREA PRINCIPAL (CHATS LADO A LADO) */}
      <main className="flex-1 overflow-hidden p-4">
        {qtdAtivas === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-4">
            <Bot className="w-16 h-16 opacity-30" />
            <p className="text-lg font-medium">Abra o menu lateral e selecione pelo menos uma IA.</p>
          </div>
        ) : (
          <div className={`grid ${gridCols} gap-4 h-full`}>
            {modelos.filter(ia => iasAtivas[ia.id]).map((ia) => (
              <div key={ia.id} className="flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden h-full shadow-lg">
                
                {/* Cabeçalho da Coluna com Botão de Exportar */}
                <div className={`bg-zinc-950/50 py-3 px-4 border-b border-zinc-800 font-bold text-center ${ia.cor} tracking-wider flex items-center justify-between gap-2`}>
                  <div className="w-5"></div> {/* Espaçador para balancear o visual */}
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 opacity-70" />
                    {ia.nome}
                  </div>
                  {respostas[ia.id] ? (
                    <button onClick={() => exportarParaMarkdown(ia.id, ia.nome)} title="Exportar resposta em MD" className="p-1 hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-zinc-200">
                      <Download className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="w-4"></div>
                  )}
                </div>
                
                {/* Corpo da Resposta */}
                <div className="p-5 overflow-y-auto flex-1 text-zinc-300 leading-relaxed scroll-smooth">
                  {respostas[ia.id] ? (
                    <div className="prose prose-invert max-w-none prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-800 prose-pre:rounded-xl">
                      <ReactMarkdown>
                        {respostas[ia.id]}
                      </ReactMarkdown>
                    </div>
                  ) : loading ? (
                    <div className="flex justify-center items-center h-full text-zinc-600">
                      <Loader2 className="animate-spin w-10 h-10" />
                    </div>
                  ) : (
                    <div className="flex flex-col justify-center items-center h-full text-zinc-700 space-y-4">
                      <Bot className="w-12 h-12 opacity-10" />
                      <p className="italic text-sm">Aguardando seu comando...</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 4. BARRA DE PROMPT (FOOTER) */}
      <footer className="p-4 bg-zinc-900 border-t border-zinc-800 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
        <form onSubmit={enviarPrompt} className="max-w-6xl mx-auto relative">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={user ? "O que você quer perguntar para as IAs?" : "Faça login para poder enviar prompts e salvar o histórico"}
            disabled={loading || qtdAtivas === 0 || !user}
            className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl py-4 pl-6 pr-16 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-inner text-zinc-100 placeholder:text-zinc-600"
          />
          <button
            type="submit"
            disabled={loading || !prompt.trim() || qtdAtivas === 0 || !user}
            className="absolute right-2 top-2 bottom-2 bg-green-500 hover:bg-green-400 text-zinc-950 p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-12"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </footer>

    </div>
  );
}
