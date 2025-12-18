"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type MainLayoutProps = {
	children: React.ReactNode;
};

export default function MainLayout({ children }: MainLayoutProps) {
	const router = useRouter();
	const { authState, authDispatch } = useAuth();

	const userName = useMemo(() => {
		const user = authState.user;
		if (!user) return "Guest";
		if (user.first_name || user.last_name) {
			return `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
		}
		if (user.username) return user.username;
		if (user.email) return user.email;
		if (user.phone_number) return user.phone_number;
		return "Host";
	}, [authState.user]);

	const avatarInitials = useMemo(() => {
		const user = authState.user;
		if (!user) return "GH";
		const base = `${user.first_name ?? ""}${user.last_name ?? ""}`.trim();
		if (base.length >= 2) {
			const parts = base.split(" ").filter(Boolean);
			if (parts.length === 1) {
				return parts[0].slice(0, 2).toUpperCase();
			}
			return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
		}
		if (user.username) return user.username.slice(0, 2).toUpperCase();
		if (user.email) return user.email.slice(0, 2).toUpperCase();
		if (user.phone_number) return user.phone_number.slice(-2).toUpperCase();
		return "GH";
	}, [authState.user]);

	const handleLogout = () => {
		authDispatch({ type: "LOGOUT" });
		router.push("/login");
	};

	return (
		<div className="relative min-h-screen overflow-hidden bg-[url('/images/bg/hustle-bg.png')] bg-cover bg-center">
			<div className="absolute inset-0 bg-black/70" />
			<div className="absolute inset-0 bg-gradient-to-tr from-purple-900/40 via-indigo-900/30 to-fuchsia-900/40" />
			<div className="relative z-10 flex min-h-screen flex-col">
				<header className="mx-4 mt-6 rounded-3xl border border-white/10 bg-white/[0.07] px-6 py-4 shadow-[0_40px_120px_-80px_rgba(5,0,20,0.9)] backdrop-blur-xl md:mx-8">
					<div className="flex items-center justify-between gap-6">
						<div className="flex flex-col gap-1 text-white/80">
							<span className="text-xs uppercase tracking-[0.3em] text-white/50">Golden Hour</span>
							<h1 className="text-lg font-semibold text-white md:text-xl">
								Control Center
							</h1>
							<p className="text-xs text-white/60 md:text-sm">
								Manage live experiences, sessions, and production tools.
							</p>
						</div>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button
									type="button"
									className="group flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.05] px-3 py-2 text-left text-white/80 backdrop-blur transition hover:border-white/30 hover:bg-white/[0.08]"
								>
									<div className="hidden text-right md:block">
										<p className="text-xs uppercase tracking-[0.2em] text-white/50">
											Signed in as
										</p>
										<span className="text-sm font-medium text-white">
											{userName || "Host"}
										</span>
									</div>
									<span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-purple-500/60 to-indigo-500/60 text-sm font-semibold text-white/90 transition group-hover:border-white/40">
										{avatarInitials}
									</span>
								</button>
							</DropdownMenuTrigger>
							<DropdownMenuContent className="min-w-[180px] rounded-2xl border border-white/10 bg-white/[0.07] p-1 text-white/80 backdrop-blur-xl">
								<DropdownMenuItem
									onSelect={() => router.push("/profile")}
									className="cursor-pointer rounded-xl px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 focus:bg-white/10"
								>
									Profile
								</DropdownMenuItem>
								<DropdownMenuSeparator className="bg-white/10" />
								<DropdownMenuItem
									onSelect={handleLogout}
									className="cursor-pointer rounded-xl px-3 py-2 text-sm text-rose-200 transition hover:bg-rose-500/10 focus:bg-rose-500/10"
								>
									Logout
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</header>
				<main className="flex-1">
					<div className="mx-auto w-full max-w-6xl">
						{children}
					</div>
				</main>
			</div>
		</div>
	);
}
