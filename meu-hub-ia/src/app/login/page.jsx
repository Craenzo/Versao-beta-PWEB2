"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Bot, Loader2, Mail, Lock } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: "", tipo: "" });
  const router = useRouter();

  const handleAuth = async (tipo) => {
    // Mantive a exigência básica só pra não mandar vazio
    if (!email || !password) {
      setMensagem({ texto: "Preencha e-mail e senha.", tipo: "erro" });
      return;
    }
    
    setLoading(true);
    setMensagem({ texto: "", tipo: "" });

    // =====================================================================
    // 1. CÓDIGO REAL DO SUPABASE (COMENTADO COMO SOLICITADO)
    // Para reativar, basta remover os símbolos de /* e */
    // =====================================================================
    
    try {
      if (tipo === "registro") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMensagem({ texto: "Conta criada! Você já pode fazer login.", tipo: "sucesso" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Manda o usuário de volta para o chat principal logado
        router.push("/");
      }
    } catch (error) {
      setMensagem({ texto: error.message || "Ocorreu um erro.", tipo: "erro" });
    } finally {
      setLoading(false);
    }
    

    // =====================================================================
    // 2. MODO DE TESTE FICTÍCIO (SEM VERIFICAÇÃO NENHUMA)
    // =====================================================================
    // setTimeout(() => {
    //   if (tipo === "registro") {
    //     setMensagem({ texto: "Conta fictícia aprovada para testes! Agora clique em Entrar.", tipo: "sucesso" });
    //   } else {
    //     // Finge que fez o login e redireciona
    //     router.push("/");
    //   }
    //   setLoading(false);
    // }, 800); // Um delay de 800ms só pra dar a ilusão de carregamento
    
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-4 font-sans text-zinc-100">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-8">
        
        {/* Cabeçalho */}
        <div className="flex flex-col items-center justify-center gap-3 mb-8">
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-full shadow-inner">
            <Bot className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-wider">HUB DE <span className="text-green-400">IAS</span></h1>
        </div>

        {/* Mensagens de Feedback */}
        {mensagem.texto && (
          <div className={`p-3 rounded-lg mb-6 text-sm text-center font-medium ${mensagem.tipo === "erro" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-green-500/10 text-green-400 border border-green-500/20"}`}>
            {mensagem.texto}
          </div>
        )}

        {/* Formulário */}
        <div className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 w-5 h-5 text-zinc-500" />
            <input
              type="email"
              placeholder="Digite seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-all placeholder:text-zinc-600"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 w-5 h-5 text-zinc-500" />
            <input
              type="password"
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-all placeholder:text-zinc-600"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              onClick={() => handleAuth("login")}
              disabled={loading}
              className="flex-1 bg-green-500 hover:bg-green-400 text-zinc-950 font-bold py-3 rounded-xl transition-colors disabled:opacity-50 flex justify-center items-center"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Entrar"}
            </button>
            <button
              onClick={() => handleAuth("registro")}
              disabled={loading}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold py-3 rounded-xl transition-colors border border-zinc-700 disabled:opacity-50"
            >
              Criar Conta
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <button onClick={() => router.push("/")} className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
            Voltar para o Chat
          </button>
        </div>
      </div>
    </div>
  );
}