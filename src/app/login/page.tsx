import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-ygg-400" />
          <div className="text-3xl font-black uppercase tracking-widest text-white">
            Yellow<span className="text-ygg-400">gate</span>
          </div>
          <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
            Rental Management — internal use only
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
