import { LoginForm } from './LoginForm';

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <p className="text-sm font-extrabold tracking-[0.3em] text-white/60">ATHENA</p>
      <h1 className="mt-4 text-3xl font-extrabold">Welcome back</h1>
      <p className="mt-2 text-white/60">Enter your passcode to see today&apos;s lessons.</p>
      <LoginForm next={next ?? '/'} />
    </main>
  );
}
