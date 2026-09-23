"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();

    if (mode === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return setMessage({ kind: "error", text: "E-mail ou senha incorretos." });
      router.replace("/");
      router.refresh();
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) return setMessage({ kind: "error", text: error.message });
      if (data.session) {
        router.replace("/");
        router.refresh();
      } else {
        setMessage({ kind: "info", text: "Conta criada! Confirme pelo link que enviamos para o seu e-mail e depois entre." });
        setMode("entrar");
      }
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <h1 className="text-center font-serif text-5xl">Meu Look</h1>
      <p className="mt-2 mb-10 text-center text-muted">Seu guarda-roupa com um stylist de IA</p>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">E-mail</label>
          <input
            className="input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Senha</label>
          <input
            className="input"
            type="password"
            autoComplete={mode === "entrar" ? "current-password" : "new-password"}
            minLength={6}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {message && (
          <p
            className={`rounded-xl p-3 text-sm ${message.kind === "error" ? "bg-red-50 text-red-700" : "bg-accent-soft"}`}
          >
            {message.text}
          </p>
        )}

        <button disabled={loading} className="btn-primary w-full">
          {loading ? "Aguarde…" : mode === "entrar" ? "Entrar" : "Criar conta"}
        </button>
      </form>

      <button
        className="mt-6 text-sm text-muted"
        onClick={() => {
          setMode(mode === "entrar" ? "criar" : "entrar");
          setMessage(null);
        }}
      >
        {mode === "entrar" ? "Primeira vez? Criar conta" : "Já tenho conta"}
      </button>
    </main>
  );
}
