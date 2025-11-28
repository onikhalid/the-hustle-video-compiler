"use client"

import { Button } from "@/components/ui/button"
import { Eye, Download, Play } from "lucide-react"
import { useRouter } from "next/navigation"

interface TStreamSession {
  id: number;
  updated_at: string;
  created_at: string;
  stream_question_ids: StreamQuestionsId[];
  start_time: null;
  end_time: null;
  is_active: boolean;
  compiled_video_asset_id: string | null;
  compiled_video_tag: string | null;
  video_time_stamps: Videotimestamps;
  total_questions: number;
  upload_completed: boolean;
  stream_used: boolean;
}

interface Videotimestamps {
  0: {
    name: string;
  }
}

interface StreamQuestionsId {
  '6'?: string;
  '5'?: string;
  '4'?: string;
  '3'?: string;
  '2'?: string;
  '1'?: string;
}

interface SessionActionsProps {
  session: TStreamSession;
}

export function SessionActions({ session }: SessionActionsProps) {
  const router = useRouter();

  const handleUseSession = () => {
    router.push(`/create-stream?sessionId=${session.id}`);
  };

  const handleViewSession = () => {
    // Handle view action - you can implement this later
    console.log("View session:", session.id);
  };

  const handleDownloadVideo = () => {
    // Handle download action - you can implement this later
    console.log("Download video:", session.compiled_video_asset_id);
  };

  return (
    <div className="flex space-x-2">
      <Button
        variant="default"
        size="sm"
        onClick={handleUseSession}
        className="bg-blue-600 hover:bg-blue-700"
      >
        <Play className="h-4 w-4 mr-1" />
        Use
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleViewSession}
      >
        <Eye className="h-4 w-4" />
      </Button>
      {session.compiled_video_asset_id && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadVideo}
        >
          <Download className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
