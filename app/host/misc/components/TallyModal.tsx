import React, { useMemo } from "react";
import { QuestionResult, Question } from "../api/quizHostApi";
import { StatusBadge } from "./StatusBadge";

type TallyModalProps = {
  isOpen: boolean;
  onClose: () => void;
  questionIndex?: number;
  questionText?: string | null;
  tallyData?: {
    question: Question;
    results: QuestionResult[];
  } | null;
};

const modalCardClasses = "rounded-3xl border border-white/10 bg-white/[0.07] p-6 shadow-[0_40px_120px_-60px_rgba(5,0,20,0.9)] backdrop-blur-xl";

export const TallyModal: React.FC<TallyModalProps> = ({
  isOpen,
  onClose,
  questionIndex,
  questionText,
  tallyData,
}) => {
  const results = tallyData?.results ?? [];

  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => {
      if (a.is_winner !== b.is_winner) {
        return a.is_winner ? -1 : 1;
      }
      if (a.is_correct !== b.is_correct) {
        return a.is_correct ? -1 : 1;
      }
      return a.answered_in - b.answered_in;
    });
  }, [results]);

  const winner = sortedResults.find((entry) => entry.is_winner) ?? null;

  if (!isOpen || !tallyData) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-10 backdrop-blur">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true"></div>
      <div className={`${modalCardClasses} relative z-10 w-full max-w-3xl text-white/90`}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full border border-white/20 bg-white/10 px-2 py-1 text-xs uppercase tracking-[0.2em] text-white/70 transition hover:bg-white/20"
        >
          Close
        </button>

        <header className="flex flex-col gap-3 pr-16">
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/50">
            <span>Round Tally</span>
            {typeof questionIndex === "number" && (
              <StatusBadge label="Question" value={`#${questionIndex}`} tone="accent" className="hidden sm:flex" />
            )}
          </div>
          <h2 className="text-xl font-semibold text-white">
            {questionText || "Question results"}
          </h2>
          {tallyData.question?.correct_option && (
            <p className="text-sm text-white/60">
              Correct answer: <span className="font-semibold text-emerald-300">{tallyData.question.correct_option}</span>
            </p>
          )}
        </header>

        {winner && (
          <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
            <div className="flex flex-wrap items-center gap-3 text-emerald-100">
              <StatusBadge label="Winner" tone="success" />
              <span className="text-base font-semibold">
                {winner.user_name || winner.user_phone || `Player ${winner.user_id}`}
              </span>
              <span className="text-xs text-emerald-200/80">Answered in {winner.answered_in}s</span>
            </div>
          </div>
        )}

        <div className="mt-6 max-h-[320px] overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03]">
          <table className="w-full text-left text-xs text-white/80">
            <thead className="sticky top-0 bg-white/[0.04] text-[11px] uppercase tracking-[0.2em] text-white/40">
              <tr>
                <th className="px-4 py-3">Contestant</th>
                <th className="px-4 py-3">Answer</th>
                <th className="px-4 py-3">Correct?</th>
                <th className="px-4 py-3">Winner</th>
                <th className="px-4 py-3 text-right">Time (s)</th>
              </tr>
            </thead>
            <tbody>
              {sortedResults.length > 0 ? (
                sortedResults.map((entry) => {
                  const name = entry.user_name || entry.user_phone || `Player ${entry.user_id}`;
                  return (
                    <tr
                      key={`${entry.user_id}-${entry.answer}`}
                      className={`${entry.is_winner ? "bg-emerald-500/10 text-emerald-100" : "odd:bg-white/[0.02]"}`}
                    >
                      <td className="px-4 py-3 text-sm font-semibold">{name}</td>
                      <td className="px-4 py-3 text-sm">{entry.answer || "—"}</td>
                      <td className="px-4 py-3 text-sm">
                        {entry.is_correct ? (
                          <span className="text-emerald-300">Yes</span>
                        ) : (
                          <span className="text-rose-300">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {entry.is_winner ? (
                          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-semibold text-emerald-100">
                            Winner
                          </span>
                        ) : (
                          ""
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-white/70">{entry.answered_in ?? "-"}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-white/50">
                    No answers recorded for this round yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
