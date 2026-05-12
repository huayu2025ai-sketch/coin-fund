"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock } from "lucide-react";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { getSupabaseClient, hasSupabaseConfig } from "@/lib/supabase-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!hasSupabaseConfig()) {
    return <ConfigurationNotice />;
  }

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const supabase = getSupabaseClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setPending(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.replace("/dashboard");
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 text-slate-900">
      <form className="ui-glass grid w-full max-w-sm gap-4 p-8" onSubmit={signIn}>
        <div>
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 shadow-sm shadow-indigo-100/50">
            <Lock className="h-4 w-4 text-blue-600" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Crypto2028 Portfolio</h1>
          <p className="mt-2 text-sm text-slate-600">私有账户登录</p>
        </div>
        <input
          className="ui-input h-10 px-3 text-sm"
          placeholder="邮箱"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <input
          className="ui-input h-10 px-3 text-sm"
          placeholder="密码"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <button
          className="ui-btn-primary ui-interactive h-10 rounded-xl text-sm font-medium hover:scale-[1.02] disabled:opacity-50"
          disabled={pending}
          type="submit"
        >
          登录
        </button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>
    </main>
  );
}
