"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { formatAxiosErrorMessage } from "@/lib/utils";
import { AxiosError } from "axios";
import { useCredentialsLogin } from "./misc/api/credentialsAuth";
import { gameAxios, setAxiosDefaultToken } from "@/lib/axios";
import { tokenStorage } from "@/lib/tokens";
import { useRouter } from "next/navigation";
import GradientButton from "@/components/ui/GradientButton";

export default function LoginPage() {
  const [phoneOrEmail, setPhoneOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const credentialsLoginMutation = useCredentialsLogin();
  const { authDispatch } = useAuth();
  const router = useRouter()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload: any = { password };
    if (phoneOrEmail.includes("@")) payload.email = phoneOrEmail;
    else payload.phone_number = phoneOrEmail;

    credentialsLoginMutation.mutate(payload, {
      onSuccess: (data) => {
        tokenStorage.setToken(data.tokens.access);
        setAxiosDefaultToken(data.tokens.access, gameAxios);
        router.push("/host");
      },
      onError: (err) => {
        setError(formatAxiosErrorMessage(err as AxiosError) ?? "");
      },
    });
  };

  const modalCardClasses = "rounded-3xl border border-white/10 bg-white/[0.07] p-8 shadow-[0_40px_120px_-60px_rgba(5,0,20,0.9)] backdrop-blur-xl";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[url('/images/bg/hustle-bg.png')] bg-cover bg-center">
      <div className="absolute inset-0 bg-black/75" />
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-fuchsia-900/30 to-indigo-900/40" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-16">
        <div className={`${modalCardClasses} w-full max-w-lg text-white/90`}>
          <header className="flex flex-col gap-2 pr-16">
            <span className="text-xs uppercase tracking-[0.3em] text-white/50">Welcome back</span>
            <h1 className="text-2xl font-semibold text-white">Admin control access</h1>
            <p className="text-sm text-white/60">
              Sign in to create sream sessions compile video recordings, spin up live quiz sessions, monitor contestants, and crown your winners in real time.
            </p>
          </header>

          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-white/50">Phone or email</label>
              <input
                value={phoneOrEmail}
                onChange={(e) => setPhoneOrEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-white/15 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none focus:ring-0"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-white/50">Password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                type="password"
                className="w-full rounded-2xl border border-white/15 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none focus:ring-0"
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={credentialsLoginMutation.isPending}
              className="cursor-pointer rounded-full w-full border border-white/20 bg-[#22C55E]/80 px-4 py-3 text-xs uppercase tracking-[0.2em] text-[#FFFFFF] transition hover:bg-white/20 mt-8 disabled:opacity-45"
              
            >
              {credentialsLoginMutation.isPending ? "Logging in..." : "Enter dashboard"}
            </button>
          </form>

          <footer className="mt-6 text-center text-[11px] uppercase tracking-[0.2em] text-white/40">
            Secure access for Admin users
          </footer>
        </div>
      </div>
    </div>
  );
}
