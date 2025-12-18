import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import GradientButton from "@/components/ui/GradientButton";

const modalCardClasses = "rounded-3xl border border-white/10 bg-white/[0.07] p-6 shadow-[0_40px_120px_-60px_rgba(5,0,20,0.9)] backdrop-blur-xl";

const createQuizSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Name must be at least 3 characters long")
    .max(120, "Name must be 120 characters or fewer"),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters long")
    .max(400, "Description must be 400 characters or fewer"),
});

export type CreateQuizFormValues = z.infer<typeof createQuizSchema>;

type CreateQuizModalProps = {
  isOpen: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (values: CreateQuizFormValues) => Promise<void> | void;
};

export const CreateQuizModal: React.FC<CreateQuizModalProps> = ({
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateQuizFormValues>({
    resolver: zodResolver(createQuizSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const internalSubmit = async (values: CreateQuizFormValues) => {
    await onSubmit(values);
    reset();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-10 backdrop-blur">
      <div className="absolute inset-0" onClick={handleClose} aria-hidden="true" />
      <div className={`${modalCardClasses} relative z-10 w-full max-w-xl text-white/90`}>
        <button
          type="button"
          onClick={handleClose}
          className="cursor-pointer absolute right-4 top-4 rounded-full border border-white/20 bg-white/10 px-2 py-1 text-xs uppercase tracking-[0.2em] text-white/70 transition hover:bg-white/20"
        >
          Close
        </button>

        <header className="flex flex-col gap-2 pr-14">
          <span className="text-xs uppercase tracking-[0.3em] text-white/50">Create quiz</span>
          <h2 className="text-xl font-semibold text-white">Spin up a new session</h2>
          <p className="text-sm text-white/60">
            Give the quiz a memorable name and a quick pitch. Players will see both.
          </p>
        </header>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit(internalSubmit)}>
          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-white/50">Name</label>
            <input
              type="text"
              {...register("name")}
              placeholder="Golden Hour Showdown"
              className="mt-2 w-full rounded-2xl border border-white/15 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none focus:ring-0"
            />
            {errors.name && (
              <p className="mt-2 text-xs text-rose-300">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs uppercase tracking-[0.2em] text-white/50">Description</label>
            <textarea
              {...register("description")}
              placeholder="Tell contestants why this quiz is unmissable."
              rows={4}
              className="mt-2 w-full rounded-2xl border border-white/15 bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none focus:ring-0"
            />
            {errors.description && (
              <p className="mt-2 text-xs text-rose-300">{errors.description.message}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/70 transition hover:bg-white/20"
            >
              Cancel
            </button>
            <GradientButton
              type="submit"
              className="px-6 py-3 text-sm font-semibold"
              size="sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create quiz"}
            </GradientButton>
          </div>
        </form>
      </div>
    </div>
  );
};
