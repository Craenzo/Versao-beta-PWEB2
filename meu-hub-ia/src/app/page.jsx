"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Send, Loader2, Bot, Menu, User, X, CheckSquare, Square, LogOut, Download, Settings2 } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Painéis independentes
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isModelsOpen, setIsModelsOpen] = useState(false);
  
  const [user, setUser] = useState(undefined);
  console.log("USUARIO:", user);
  const [activeChatId, setActiveChatId] = useState(null);
  const [historicoChats, setHistoricoChats] = useState([]);

  const [chatMessages, setChatMessages] = useState([]);

  // Catálogo completo de IAs
  // Catálogo Expandido de IAs (As 15 Melhores do OpenRouter)
  const modelos = [
    { id: "chatgpt", nome: "ChatGPT (GPT-4o Mini)", modeloApi: "openai/gpt-4o-mini", cor: "text-emerald-400" },
    { id: "gpt4o", nome: "GPT-4o (OpenAI Flagship)", modeloApi: "openai/gpt-4o", cor: "text-emerald-300" },
    { id: "gemini", nome: "Gemini Flash (Google)", modeloApi: "google/gemini-2.5-flash", cor: "text-blue-400" },
    { id: "geminipro", nome: "Gemini Pro (Google)", modeloApi: "google/gemini-2.5-pro", cor: "text-blue-300" },
    { id: "grok", nome: "Grok (xAI)", modeloApi: "x-ai/grok-4.3", cor: "text-red-400" },
    { id: "claude", nome: "Claude 3 Haiku", modeloApi: "anthropic/claude-3-haiku", cor: "text-amber-400" },
    { id: "claudesonnet", nome: "Claude 3.5 Sonnet", modeloApi: "anthropic/claude-3.5-sonnet", cor: "text-amber-300" },
    { id: "llama", nome: "Llama 3.1 (8B)", modeloApi: "meta-llama/llama-3.1-8b-instruct", cor: "text-indigo-400" },
    { id: "llama70b", nome: "Llama 3.1 (70B)", modeloApi: "meta-llama/llama-3.1-70b-instruct", cor: "text-indigo-300" },
    { id: "mixtral", nome: "Mixtral 8x7B", modeloApi: "mistralai/mixtral-8x7b-instruct", cor: "text-orange-400" },
    { id: "deepseek", nome: "DeepSeek Coder", modeloApi: "deepseek/deepseek-coder", cor: "text-cyan-400" },
    { id: "cohere", nome: "Command R+ (Cohere)", modeloApi: "cohere/command-r-plus", cor: "text-teal-400" },
    { id: "phi3", nome: "Phi-3 Mini (Microsoft)", modeloApi: "microsoft/phi-3-mini-128k-instruct", cor: "text-sky-400" },
    { id: "qwen", nome: "Qwen 2 (72B)", modeloApi: "qwen/qwen-2-72b-instruct", cor: "text-purple-400" },
    { id: "perplexity", nome: "Sonar (Perplexity)", modeloApi: "perplexity/llama-3-sonar-large-32k-chat", cor: "text-sky-300" }
  ];

  // Controle de IAs ativas
  const [iasAtivas, setIasAtivas] = useState({
    chatgpt: true,
    gpt4o: false,
    gemini: true,
    geminipro: false,
    grok: true,
    claude: false,
    claudesonnet: false,
    llama: false,
    llama70b: false,
    mixtral: false,
    deepseek: false,
    cohere: false,
    phi3: false,
    qwen: false,
    perplexity: false
  });

  const messagesEndRef = useRef(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, loading]);

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

  const carregarMensagensDoChat = async (chatId) => {
    setActiveChatId(chatId);
    setIsHistoryOpen(false);
    setChatMessages([]);

    const { data, error } = await supabase
      .from("mensagens")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      const formatadas = data.map((msg) => ({
        id: msg.id,
        role: msg.ia_id === "user" ? "user" : "assistant",
        content: msg.conteudo,
        ia_id: msg.ia_id === "user" ? null : msg.ia_id
      }));
      setChatMessages(formatadas);
    }
  };

  // Função para adicionar/remover IAs com limite de 3
  const toggleIa = (id) => {
    setIasAtivas(prev => {
      const isAtiva = prev[id];
      const qtdAtivas = Object.values(prev).filter(Boolean).length;

      if (!isAtiva && qtdAtivas >= 3) {
        alert("Você já selecionou 3 IAs. Desmarque uma para poder adicionar outra.");
        return prev;
      }
      return { ...prev, [id]: !isAtiva };
    });
  };

  const enviarPrompt = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    const promptAtual = prompt;
    setPrompt("");

    const novoUserMsg = { id: Date.now().toString(), role: "user", content: promptAtual, ia_id: null };
    setChatMessages(prev => [...prev, novoUserMsg]);

    let chatId = activeChatId;

    if (user && !chatId) {
      const tituloGerado = promptAtual.length > 25 ? promptAtual.substring(0, 25) + "..." : promptAtual;
      const { data: novoChat, error: erroChat } = await supabase
        .from("chats")
        .insert([{ user_id: user.id, titulo: tituloGerado }])
        .select()
        .single();

      console.log("CHAT CRIADO:", novoChat);
      console.log("ERRO CHAT:", erroChat);

      if (!erroChat && novoChat) {
        chatId = novoChat.id;
        setActiveChatId(chatId);
        carregarListaChats(user.id);
      }
    }

    if (user && chatId) {
      await supabase.from("mensagens").insert([
        { chat_id: chatId, ia_id: "user", conteudo: promptAtual }
      ]);
    }

    const modelosAtivos = modelos.filter(ia => iasAtivas[ia.id]);

    const promessas = modelosAtivos.map(async (ia) => {
      try {
        const historicoIA = chatMessages
          .filter(m => m.role === "user" || m.ia_id === ia.id)
          .map(m => ({ role: m.role, content: m.content }));
        
        historicoIA.push({ role: "user", content: promptAtual });

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: historicoIA, model: ia.modeloApi }),
        });
        
        const data = await res.json();
        const respostaTexto = data.text || data.error || "Erro ao gerar resposta.";
        
        const novaIAMsg = { id: Math.random().toString(), role: "assistant", content: respostaTexto, ia_id: ia.id };
        setChatMessages(prev => [...prev, novaIAMsg]);

        if (user && chatId) {
          await supabase.from("mensagens").insert([
            { chat_id: chatId, ia_id: ia.id, conteudo: respostaTexto }
          ]);
        }
      } catch (error) {
        const errorMsg = { id: Math.random().toString(), role: "assistant", content: "Falha na conexão.", ia_id: ia.id };
        setChatMessages(prev => [...prev, errorMsg]);
      }
    });

    await Promise.all(promessas);
    setLoading(false);
  };

  const novaConversa = () => {
    setActiveChatId(null);
    setChatMessages([]);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    novaConversa();
  };

  const qtdAtivas = Object.values(iasAtivas).filter(Boolean).length;
  const gridCols = qtdAtivas === 1 ? "grid-cols-1" : qtdAtivas === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-3";

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      
      {/* HEADER */}
      <header className="px-4 py-3 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between z-10 shadow-md">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsHistoryOpen(true)} className="p-2 hover:bg-zinc-800 rounded-md transition-colors text-zinc-300" title="Histórico de Conversas">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <Bot className="text-green-400 w-8 h-8" />
            <h1 className="text-xl font-bold tracking-wider hidden sm:block">HUB DE <span className="text-green-400">IAS</span></h1>
          </div>
          {chatMessages.length > 0 && (
            <button onClick={novaConversa} className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded-md text-zinc-400 hover:text-zinc-200 transition-colors">
              + Novo Chat
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {/* NOVO: Botão de Configurar IAs direto no Header */}
          <button 
            onClick={() => setIsModelsOpen(true)} 
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-full transition-colors border border-zinc-700 text-zinc-300"
          >
            <Settings2 className="w-4 h-4" />
            <span className="text-sm font-semibold hidden md:block">IAs Ativas ({qtdAtivas}/3)</span>
          </button>

          <div className="h-6 w-px bg-zinc-800 hidden md:block"></div>

          {user === undefined ? (
            <div className="w-24 h-8 bg-zinc-800 animate-pulse rounded-full"></div>
          ) : user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-400 hidden lg:inline max-w-[150px] truncate">{user.email}</span>
              <button onClick={handleLogout} className="flex items-center gap-2 bg-red-950/40 hover:bg-red-900/40 border border-red-900/30 text-red-400 px-4 py-2 rounded-full transition-colors text-sm font-semibold">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          ) : (
            <Link href="/login" className="flex items-center gap-2 bg-green-500 hover:bg-green-400 px-4 py-2 rounded-full transition-colors text-zinc-950 shadow-sm">
              <User className="w-4 h-4" />
              <span className="text-sm font-bold tracking-wide">Login</span>
            </Link>
          )}
        </div>
      </header>

      {/* PAINEL ESQUERDO: HISTÓRICO DE CHATS */}
      {isHistoryOpen && (
        <div className="absolute inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsHistoryOpen(false)}></div>
          <div className="relative w-80 bg-zinc-900 border-r border-zinc-800 h-full p-6 shadow-2xl flex flex-col">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-800">
              <h2 className="text-lg font-bold tracking-wide">Seu Histórico</h2>
              <button onClick={() => setIsHistoryOpen(false)} className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-md transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-1">
              {!user ? (
                <div className="text-center mt-10">
                  <Bot className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500">Faça login para salvar seus chats automaticamente.</p>
                </div>
              ) : historicoChats.length === 0 ? (
                <p className="text-sm text-zinc-600 italic text-center my-4">Nenhum chat salvo ainda.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {historicoChats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => carregarMensagensDoChat(chat.id)}
                      className={`text-left p-3 rounded-xl text-sm transition-all truncate border ${activeChatId === chat.id ? "bg-green-500/10 border-green-500/30 text-green-400 font-medium" : "bg-zinc-950/20 border-zinc-800/50 hover:bg-zinc-800 text-zinc-400"}`}
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

      {/* PAINEL DIREITO: SELEÇÃO DE IAs */}
      {isModelsOpen && (
        <div className="absolute inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsModelsOpen(false)}></div>
          <div className="relative w-80 bg-zinc-900 border-l border-zinc-800 h-full p-6 shadow-2xl flex flex-col">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-800">
              <div>
                <h2 className="text-lg font-bold tracking-wide">Catálogo de IAs</h2>
                <p className="text-xs text-zinc-500 mt-1">Selecione até 3 modelos</p>
              </div>
              <button onClick={() => setIsModelsOpen(false)} className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-md transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="flex flex-col gap-3">
                {modelos.map(ia => (
                  <button 
                    key={ia.id}
                    onClick={() => toggleIa(ia.id)}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all text-left group text-sm ${iasAtivas[ia.id] ? "border-green-500/50 bg-green-500/10" : "border-zinc-800/60 bg-zinc-950/40 hover:bg-zinc-800"}`}
                  >
                    <span className={`font-semibold ${ia.cor}`}>{ia.nome}</span>
                    {iasAtivas[ia.id] ? <CheckSquare className="text-green-400 w-5 h-5 flex-shrink-0" /> : <Square className="text-zinc-600 group-hover:text-zinc-400 w-5 h-5 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
            
            <button onClick={() => setIsModelsOpen(false)} className="mt-4 w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold py-3 rounded-xl transition-colors">
              Pronto
            </button>
          </div>
        </div>
      )}

      {/* ÁREA PRINCIPAL (CHATS) */}
      <main className="flex-1 overflow-hidden p-4">
        {qtdAtivas === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-4">
            <Settings2 className="w-16 h-16 opacity-30" />
            <p className="text-lg font-medium">Abra o menu superior direito e escolha as IAs.</p>
            <button onClick={() => setIsModelsOpen(true)} className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-200 font-medium transition-colors">
              Escolher Modelos
            </button>
          </div>
        ) : (
          <div className={`grid ${gridCols} gap-4 h-full`}>
            {modelos.filter(ia => iasAtivas[ia.id]).map((ia) => {
              const mensagensDaColuna = chatMessages.filter(m => m.role === 'user' || m.ia_id === ia.id);

              return (
                <div key={ia.id} className="flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden h-full shadow-lg">
                  <div className={`bg-zinc-950/50 py-3 px-4 border-b border-zinc-800 font-bold text-center ${ia.cor} tracking-wider flex items-center justify-center gap-2`}>
                    <Bot className="w-5 h-5 opacity-70" />
                    {ia.nome}
                  </div>
                  
                  <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-5 scroll-smooth">
                    {mensagensDaColuna.length === 0 && !loading ? (
                       <div className="flex flex-col justify-center items-center h-full text-zinc-700 space-y-4">
                         <Bot className="w-12 h-12 opacity-10" />
                         <p className="italic text-sm">Pronto para responder...</p>
                       </div>
                    ) : (
                      mensagensDaColuna.map((msg) => (
                        <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                          <div className={`p-4 rounded-2xl max-w-[90%] shadow-sm ${msg.role === 'user' ? 'bg-zinc-800 text-zinc-100 rounded-br-none' : 'bg-zinc-950/60 border border-zinc-800 rounded-bl-none text-zinc-300 prose prose-invert prose-pre:bg-zinc-900'}`}>
                            {msg.role === 'user' ? (
                              <span className="whitespace-pre-wrap">{msg.content}</span>
                            ) : (
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    {loading && (
                      <div className="flex justify-start">
                        <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800 rounded-bl-none flex items-center gap-2 text-zinc-500">
                          <Loader2 className="animate-spin w-5 h-5" />
                          <span className="text-sm">Processando...</span>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="p-4 bg-zinc-900 border-t border-zinc-800 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
        <form onSubmit={enviarPrompt} className="max-w-6xl mx-auto relative">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="O que você quer perguntar para as IAs?"
            disabled={loading || qtdAtivas === 0}
            className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl py-4 pl-6 pr-16 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-inner text-zinc-100 placeholder:text-zinc-600"
          />
          <button
            type="submit"
            disabled={loading || !prompt.trim() || qtdAtivas === 0}
            className="absolute right-2 top-2 bottom-2 bg-green-500 hover:bg-green-400 text-zinc-950 p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-12"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </footer>

    </div>
  );
}