import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-2xl font-black tracking-tight">
            <span className="text-amber-500">YGG</span> Loan Management
          </div>
          <p className="mt-1 text-sm text-slate-500">Yellowgate Group — internal use only</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
