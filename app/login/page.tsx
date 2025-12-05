"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { formatAxiosErrorMessage } from "@/lib/utils";
import { AxiosError } from "axios";
import { useCredentialsLogin } from "./misc/api/credentialsAuth";
import { gameAxios, setAxiosDefaultToken } from "@/lib/axios";
import { tokenStorage } from "@/lib/tokens";
import { useRouter } from "next/navigation";

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-900 cols">
      <form
        onSubmit={handleLogin}
        className="bg-white/10 p-8 rounded-xl shadow-lg w-full max-w-md flex flex-col gap-4"
      >
        <h1 className="text-2xl font-bold text-white mb-4 text-center">Login</h1>
        <input
          value={phoneOrEmail}
          onChange={(e) => setPhoneOrEmail(e.target.value)}
          placeholder="Phone or email"
          className="w-full p-3 rounded bg-white/20 text-white placeholder:text-white/60"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          className="w-full p-3 rounded bg-white/20 text-white placeholder:text-white/60"
        />
        {error && <div className="text-red-400 text-sm text-center">{error}</div>}
        <Button type="submit" className="w-full mt-2" disabled={credentialsLoginMutation.isPending}>
          {credentialsLoginMutation.isPending ? "Logging in..." : "Login"}
        </Button>
      </form>
    </div>
  );
}
