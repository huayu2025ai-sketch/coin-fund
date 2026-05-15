"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <main className="grid min-h-screen place-items-center px-6">
          <section className="ui-card w-full max-w-md p-8 text-center">
            <h1 className="ui-title text-xl font-semibold">应用发生错误</h1>
            <p className="ui-subtitle mt-3 text-sm">{error.message || "未知错误"}</p>
            <button
              className="ui-btn-primary ui-interactive mt-6 rounded-xl px-5 py-2 text-sm font-medium"
              onClick={reset}
              type="button"
            >
              重试
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
