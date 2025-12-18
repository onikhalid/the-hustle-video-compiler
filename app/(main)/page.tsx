import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const navigationCards = [
  {
    title: "Streams",
    description: "Monitor, review, and fine-tune every broadcast in real time.",
    href: "/streams",
  },
  {
    title: "Host",
    description: "Spin up quizzes, control rounds, and orchesxtrate live shows.",
    href: "/host",
  },
];

export default function MainLanding() {
  return (
    <div className="space-y-10">
      <section className="flex flex-col gap-3 text-white/80">
      
        <h2 className="text-2xl font-semibold text-white md:text-3xl mt-6">
          Where do you want to take control?
        </h2>
        <p className="max-w-2xl text-sm text-white/60 md:text-base">
          Jump into a dedicated workspace for managing live streams or commanding quiz sessions.
        </p>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {navigationCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-6 text-white/80 shadow-[0_40px_120px_-60px_rgba(5,0,20,0.85)] backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.1]"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-purple-500/10 opacity-0 transition group-hover:opacity-100" />
            <div className="relative flex h-full flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">
                  {card.title}
                </h3>
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/70 transition group-hover:border-white/40 group-hover:text-white">
                  <ArrowRight className="h-5 w-5" />
                </span>
              </div>
              <p className="text-sm text-white/60 md:text-base">
                {card.description}
              </p>
              <span className="mt-auto text-xs uppercase tracking-[0.25em] text-white/50 transition group-hover:text-white/70">
                Enter workspace
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}