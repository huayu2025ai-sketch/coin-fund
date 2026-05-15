"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <section className="ui-card w-full max-w-md p-8 text-center">
        <h1 className="ui-title text-xl font-semibold">页面发生错误</h1>
        <p className="ui-subtitle mt-3 text-sm">
          请重试，若问题持续请查看服务日志。
        </p>
        <button
          className="ui-btn-primary ui-interactive mt-6 rounded-xl px-5 py-2 text-sm font-medium"
          onClick={reset}
          type="button"
        >
          重新加载
        </button>
      </section>
    </main>
  );
}
