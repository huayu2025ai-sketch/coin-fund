"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ConfigurationNotice } from "@/components/configuration-notice";
import { getSupabaseClient, hasSupabaseConfig } from "@/lib/supabase-client";

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hasSupabaseConfig()) {
      return;
    }

    let active = true;
    const supabase = getSupabaseClient();

    supabase.auth.getSession().then(({ data }) => {
      if (!active) {
        return;
      }

      if (!data.session) {
        router.replace("/login");
        return;
      }

      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login");
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (!hasSupabaseConfig()) {
    return <ConfigurationNotice />;
  }

  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center bg-white text-sm text-neutral-500 dark:bg-[#0b1120] dark:text-neutral-400">
        加载中
      </main>
    );
  }

  return children;
}
