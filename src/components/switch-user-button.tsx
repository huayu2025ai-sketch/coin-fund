"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserRoundCog } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase-client";

export function SwitchUserButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSwitchUser() {
    if (pending) return;

    setPending(true);

    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut({ scope: "global" });
    } finally {
      router.replace("/login");
      router.refresh();
      setPending(false);
    }
  }

  return (
    <button
      className="ui-input ui-interactive inline-flex h-9 items-center gap-2 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      disabled={pending}
      onClick={onSwitchUser}
      type="button"
    >
      <UserRoundCog className="h-3.5 w-3.5" />
      {pending ? "切换中" : "切换用户"}
    </button>
  );
}
