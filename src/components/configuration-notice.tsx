export function ConfigurationNotice() {
  return (
    <main className="grid min-h-screen place-items-center bg-white px-4 text-neutral-950">
      <section className="w-full max-w-xl border-t border-neutral-200 pt-5">
        <p className="text-xs font-medium uppercase text-neutral-500">
          需要配置
        </p>
        <h1 className="mt-2 text-xl font-semibold">尚未配置 Supabase</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-600">
          请在项目根目录创建 <code className="font-mono">.env.local</code>
          ，然后重启开发服务。
        </p>
        <pre className="mt-4 overflow-x-auto rounded-md bg-neutral-950 p-4 text-xs text-white">
          {`NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key`}
        </pre>
        <p className="mt-4 text-sm text-neutral-600">
          然后执行 <code className="font-mono">supabase/schema.sql</code> 中的 SQL。
        </p>
      </section>
    </main>
  );
}
