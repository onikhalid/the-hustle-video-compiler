"use client";

import React, { useState } from "react";
import { useCreateLiveQuiz, useListQuizSessions } from "./misc/api/quizHostApi";
import { useRouter } from "next/navigation";
import Link from "next/link";
import GradientButton from "@/components/ui/GradientButton";
import { CreateQuizModal, CreateQuizFormValues } from "./components/CreateQuizModal";

export default function HostQuizList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: quizSessions } = useListQuizSessions();
  const createQuiz = useCreateLiveQuiz();
  const router = useRouter();

  // Create quiz
  const handleCreateQuiz = async () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmitCreateQuiz = async (values: CreateQuizFormValues) => {
    try {
      const res = await createQuiz.mutateAsync(values);
      setIsModalOpen(false);
      router.push(`/host/${res.data.id}`);
    } catch (error) {
      console.error("Failed to create quiz", error);
    }
  };

  return (
    <div className=" min-h-screen">
      <div className="flex flex-col items-center justify-center pt-8 relative z-[5]">
        <h2
          className="md:text-[48px] text-xl font-black text-white relative leading-none"
          style={{
            // fontFamily: "Wix Madefor Display",
            textShadow: `
              -3px -3px 0 #840045,
              3px 3px 0 #FFC700
            `,
          }}
        >
          Golden Hour
        </h2>
        <p className="md:text-base text-xs text-white font-gilroy-medium pt-[0.75rem]">
          Join live quizzes to win big!
        </p>
      </div>

      <section className="max-w-6xl mx-auto px-4 py-6 flex items-center">
        <button
          onClick={handleCreateQuiz}
          className="bg-green-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-800 transition-colors"
        >
          Create New Quiz
        </button>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 relative z-[5] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quizSessions?.results.data.map((quiz) => (
          <div
            key={quiz.id}
            className="relative block overflow-hidden rounded-2xl border p-4 hover:bg-gray-50 xl:min-h-[150px]"
            style={{
              backgroundImage: "url(/collaboration/collab_card.jpg)",
              backgroundSize: "cover",
            }}
          >
            <div className="absolute inset-0 bg-[#000000AD]" />
            <div className="z-2 relative flex h-full flex-col gap-4">
              <header className="z-2 flex w-full items-center justify-between rounded-xl bg-white p-2 md:p-3 md:px-4">
                <h2 className="flex items-center gap-2">
                  <svg
                    width="20"
                    height="18"
                    viewBox="0 0 20 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M0.0094396 5.0463C-0.161471 2.31173 2.01029 0 4.75019 0H8.99238C10.235 0 11.2424 1.00736 11.2424 2.25C11.2424 2.66421 11.5782 3 11.9924 3H14.3388C17.0062 3 19.1111 5.26232 18.9238 7.91895V9.25C18.9238 9.34108 18.9076 9.42836 18.8778 9.50912C19.2897 10.2352 19.4021 11.1366 19.0753 12.0122C19.0752 12.0124 19.0752 12.0127 19.0751 12.0129L17.9558 15.0122C17.9412 15.0514 17.9233 15.0892 17.9024 15.1253C17.0788 16.5502 15.538 17.5 13.7883 17.5H5.25019C3.49872 17.5 1.95904 16.5489 1.13605 15.1254C0.779051 14.5079 0.556635 13.8014 0.50944 13.0463L0.0094396 5.0463ZM5.25019 16H13.7883C14.963 16 16.0017 15.3745 16.5735 14.4259L17.6697 11.4884C17.6698 11.4882 17.6699 11.488 17.67 11.4878C18.0292 10.5253 17.3175 9.5 16.2901 9.5H12.5129C11.2534 9.5 10.2954 8.36906 10.5024 7.1267C10.5571 6.79864 10.3041 6.5 9.97153 6.5H6.79067C5.23753 6.5 3.90388 7.60449 3.61448 9.13043L3.37565 10.3897L3.37241 10.4058L2.82117 13.0008C2.49303 14.5454 3.67106 16 5.25019 16ZM11.982 7.3733C11.9273 7.70136 12.1803 8 12.5129 8H16.2901C16.6963 8 17.078 8.07939 17.4238 8.22168V7.89138C17.4238 7.87219 17.4246 7.853 17.426 7.83386C17.5644 6.0355 16.1424 4.5 14.3388 4.5H11.9924C10.7497 4.5 9.74238 3.49264 9.74238 2.25C9.74238 1.83579 9.4066 1.5 8.99238 1.5H4.75019C2.87552 1.5 1.38958 3.08171 1.50652 4.95273L1.84543 10.3753L1.90344 10.1022L2.14075 8.85094C2.56443 6.61697 4.51688 5 6.79067 5H9.97153C11.231 5 12.1891 6.13094 11.982 7.3733Z"
                      fill="#FEC601"
                    />
                  </svg>

                  <span className="font-medium">{quiz.game_code}</span>
                </h2>
                <button
                  onClick={() => {}}
                  className="transition-opacity hover:opacity-70"
                  aria-label="Delete collaboration"
                >
                  <svg
                    width="18"
                    height="19"
                    viewBox="0 0 18 19"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M3.46408 3.25646C3.52292 3.23224 3.58584 3.21517 3.65191 3.20645L3.67994 3.20275C4.33111 3.1168 4.88571 2.68723 5.13176 2.07825C5.63923 0.822252 6.85829 0 8.21293 0H9.56012C10.933 0 12.1684 0.83329 12.6827 2.10615L12.7731 2.32999C12.9609 2.7949 13.3774 3.12837 13.8722 3.21001C13.9296 3.21948 13.9844 3.23524 14.036 3.25646C14.8225 3.3179 15.5126 3.37899 16.0095 3.42508C16.2637 3.44865 16.4675 3.46831 16.608 3.4821L16.7696 3.49815L16.8256 3.50381C16.8256 3.50382 16.8267 3.50392 16.7501 4.25L16.8267 3.50392C17.2387 3.54623 17.5384 3.91456 17.4961 4.3266C17.4538 4.73865 17.0855 5.03838 16.6734 4.99608L16.6196 4.99062L16.4614 4.97493C16.3234 4.96137 16.1223 4.94197 15.871 4.91867C15.3684 4.87206 14.6656 4.80989 13.8658 4.74775C12.2607 4.62302 10.2847 4.5 8.75006 4.5C7.21543 4.5 5.23943 4.62302 3.6343 4.74775C2.83447 4.80989 2.13175 4.87206 1.62912 4.91867C1.37786 4.94197 1.17676 4.96137 1.03869 4.97493L0.880525 4.99062L0.82736 4.99601C0.827357 4.99601 0.826666 4.99608 0.825928 4.9889L0.82736 4.99601C0.415312 5.03831 0.046288 4.73865 0.00398085 4.3266C-0.0383263 3.91456 0.261407 3.54623 0.673455 3.50392L0.750059 4.25C0.673455 3.50392 0.673394 3.50393 0.673455 3.50392L0.730499 3.49815L0.892144 3.4821C1.03262 3.46831 1.23641 3.44865 1.4906 3.42508C1.98752 3.379 2.67761 3.3179 3.46408 3.25646ZM6.52253 2.64018C6.80094 1.95111 7.46974 1.5 8.21293 1.5H9.56012C10.3215 1.5 11.0067 1.96214 11.2919 2.66808L11.3823 2.89191C11.4089 2.95755 11.4376 3.02191 11.4685 3.0849C10.5253 3.03433 9.57976 3 8.75006 3C8.00244 3 7.16079 3.02787 6.31152 3.07039C6.39144 2.93341 6.46209 2.78976 6.52253 2.64018Z"
                      fill="#BC1B06"
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M2.78959 7.65963L3.14701 15.8803C3.21678 17.485 4.53801 18.75 6.14418 18.75H10.9561C12.5122 18.75 13.81 17.5602 13.9448 16.0099L14.6677 7.69731C14.7138 7.16658 14.3365 6.69382 13.8076 6.63052C12.5716 6.48261 10.3703 6.25 8.75004 6.25C7.11235 6.25 4.88097 6.48765 3.6529 6.63527C3.14052 6.69686 2.76717 7.14406 2.78959 7.65963ZM5.75004 15C5.33583 15 5.00004 15.3358 5.00004 15.75C5.00004 16.1642 5.33583 16.5 5.75004 16.5H11.75C12.1643 16.5 12.5 16.1642 12.5 15.75C12.5 15.3358 12.1643 15 11.75 15H5.75004ZM5.00004 12.75C5.00004 12.3358 5.33583 12 5.75004 12H11.75C12.1643 12 12.5 12.3358 12.5 12.75C12.5 13.1642 12.1643 13.5 11.75 13.5H5.75004C5.33583 13.5 5.00004 13.1642 5.00004 12.75ZM5.75004 9C5.33583 9 5.00004 9.33579 5.00004 9.75C5.00004 10.1642 5.33583 10.5 5.75004 10.5H11.75C12.1643 10.5 12.5 10.1642 12.5 9.75C12.5 9.33579 12.1643 9 11.75 9H5.75004Z"
                      fill="#BC1B06"
                    />
                  </svg>
                </button>
              </header>
              <div className="flex flex-1 flex-col justify-between gap-4 md:gap-6 lg:px-2">
                <div>
                  <h6 className="text-xs text-[#9AA4B2] md:text-sm">
                    Description
                  </h6>
                  <p className="mt-1 line-clamp-5 text-xs text-white md:min-h-[4lh] md:text-sm">
                    Join us for an exciting live quiz session where you can test
                    your knowledge and win amazing prizes! Our quizzes cover a
                    variety of topics, ensuring there's something for everyone.
                    Don't miss out on the fun and the chance to showcase your
                    trivia skills.
                    {/* {quiz.description} */}
                  </p>
                </div>

                <footer className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-sm font-medium text-white md:text-base">
                    <svg
                      width="15"
                      height="12"
                      viewBox="0 0 15 12"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12.066 9.64787C11.6575 9.71649 11.382 10.1033 11.4506 10.5118C11.5193 10.9202 11.906 11.1958 12.3145 11.1271L12.1903 10.3875L12.066 9.64787ZM11.2614 5.53678C10.8472 5.53678 10.5114 5.87256 10.5114 6.28678C10.5114 6.70099 10.8472 7.03678 11.2614 7.03678V6.28678V5.53678ZM10.5693 3.96199V4.71199C11.6763 4.71199 12.5734 3.81435 12.5734 2.70749H11.8234H11.0734C11.0734 2.98632 10.8475 3.21199 10.5693 3.21199V3.96199ZM9.31514 2.70749H8.56514C8.56514 3.81435 9.46222 4.71199 10.5693 4.71199V3.96199V3.21199C10.291 3.21199 10.0651 2.98632 10.0651 2.70749H9.31514ZM10.5693 1.453V0.703002C9.46222 0.703002 8.56514 1.60064 8.56514 2.70749H9.31514H10.0651C10.0651 2.42867 10.291 2.203 10.5693 2.203V1.453ZM11.8234 2.70749H12.5734C12.5734 1.60064 11.6763 0.703002 10.5693 0.703002V1.453V2.203C10.8475 2.203 11.0734 2.42867 11.0734 2.70749H11.8234ZM14.25 8.37307H13.5C13.5 8.68221 13.4026 8.93448 13.2121 9.13438C13.0148 9.34132 12.6636 9.54748 12.066 9.64787L12.1903 10.3875L12.3145 11.1271C13.143 10.988 13.8218 10.6688 14.2978 10.1693C14.7806 9.66284 15 9.02767 15 8.37307H14.25ZM11.2614 6.28678V7.03678C11.9521 7.03678 12.5451 7.23344 12.9454 7.51282C13.3481 7.79394 13.5 8.10979 13.5 8.37307H14.25H15C15 7.48411 14.4829 6.75682 13.804 6.28286C13.1225 5.80715 12.2213 5.53678 11.2614 5.53678V6.28678ZM6.9469 2.57202H6.1969C6.1969 3.34883 5.68786 3.77302 5.16887 3.77302V4.52302V5.27302C6.61383 5.27302 7.6969 4.07622 7.6969 2.57202H6.9469ZM5.16887 4.52302V3.77302C4.64988 3.77302 4.14084 3.34883 4.14084 2.57202H3.39084H2.64084C2.64084 4.07622 3.72391 5.27302 5.16887 5.27302V4.52302ZM3.39084 2.57202H4.14084C4.14084 2.18419 4.27175 1.92927 4.43453 1.77096C4.60192 1.60816 4.8522 1.5 5.16887 1.5V0.75V0C4.50357 0 3.86483 0.232596 3.38871 0.695669C2.90796 1.16324 2.64084 1.81934 2.64084 2.57202H3.39084ZM5.16887 0.75V1.5C5.48555 1.5 5.73582 1.60816 5.90322 1.77096C6.06599 1.92927 6.1969 2.18419 6.1969 2.57202H6.9469H7.6969C7.6969 1.81934 7.42979 1.16324 6.94904 0.695669C6.47291 0.232596 5.83417 0 5.16887 0V0.75ZM9.8027 9.1259H9.0527C9.0527 9.36042 8.9369 9.67029 8.37581 9.96283C7.78991 10.2683 6.79547 10.5 5.27635 10.5L5.27635 11.25L5.27635 12C6.91196 12 8.18069 11.7562 9.06929 11.2929C9.98269 10.8167 10.5527 10.0645 10.5527 9.1259H9.8027ZM5.27635 11.25L5.27635 10.5C3.75723 10.5 2.76279 10.2683 2.17689 9.96283C1.6158 9.67029 1.5 9.36042 1.5 9.1259H0.75H0C0 10.0645 0.570008 10.8167 1.48342 11.2929C2.37201 11.7562 3.64074 12 5.27635 12L5.27635 11.25ZM0.75 9.1259H1.5C1.5 9.00161 1.63604 8.65876 2.39435 8.3029C3.09316 7.97497 4.11129 7.75181 5.27635 7.75181V7.00181V6.25181C3.94158 6.25181 2.69653 6.50414 1.75712 6.94498C0.87722 7.3579 0 8.07709 0 9.1259H0.75ZM5.27635 7.00181V7.75181C6.44141 7.75181 7.45954 7.97497 8.15835 8.3029C8.91666 8.65876 9.0527 9.00161 9.0527 9.1259H9.8027H10.5527C10.5527 8.07709 9.67548 7.3579 8.79558 6.94498C7.85617 6.50414 6.61112 6.25181 5.27635 6.25181V7.00181Z"
                        fill="#CDD5DF"
                      />
                    </svg>
                    {quiz.anchor_name}{" "}
                  </span>

                  <Link href={`/host/${quiz.id}`} className="text-[#551FB9]">
                    <GradientButton
                      className="w-max"
                      size="xs"
                      customSizeConfig={{ width: 100 }}
                    >
                      Manage
                    </GradientButton>
                  </Link>
                </footer>
              </div>
            </div>
          </div>
        ))}
      </div>
      <CreateQuizModal
        isOpen={isModalOpen}
        isSubmitting={createQuiz.isPending}
        onClose={handleCloseModal}
        onSubmit={handleSubmitCreateQuiz}
      />
    </div>
  );
}
