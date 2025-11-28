"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpDown } from "lucide-react"
import { SessionActions } from "./session-actions"

// Type definition from the API response
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

export const streamSessionColumns: ColumnDef<TStreamSession>[] = [
  {
    accessorKey: "id",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          ID
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div className="font-medium">#{row.getValue("id")}</div>,
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created At
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue("created_at"))
      return <div>{date.toLocaleDateString()} {date.toLocaleTimeString()}</div>
    },
  },
  {
    accessorKey: "total_questions",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Questions
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div className="text-center">{row.getValue("total_questions")}</div>,
  },
  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.getValue("is_active") as boolean
      return (
        <Badge variant={isActive ? "default" : "secondary"}>
          {isActive ? "Active" : "Inactive"}
        </Badge>
      )
    },
  },
  {
    accessorKey: "upload_completed",
    header: "Upload Status",
    cell: ({ row }) => {
      const uploadCompleted = row.getValue("upload_completed") as boolean
      return (
        <Badge variant={uploadCompleted ? "default" : "destructive"}>
          {uploadCompleted ? "Completed" : "Pending"}
        </Badge>
      )
    },
  },
  {
    accessorKey: "stream_used",
    header: "Stream Used",
    cell: ({ row }) => {
      const streamUsed = row.getValue("stream_used") as boolean
      return (
        <Badge variant={streamUsed ? "default" : "outline"}>
          {streamUsed ? "Used" : "Not Used"}
        </Badge>
      )
    },
  },
  {
    accessorKey: "compiled_video_asset_id",
    header: "Video Asset",
    cell: ({ row }) => {
      const assetId = row.getValue("compiled_video_asset_id") as string | null
      return assetId ? (
        <div className="max-w-[150px] truncate font-mono text-sm">{assetId}</div>
      ) : (
        <span className="text-muted-foreground">No asset</span>
      )
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const session = row.original
      
      return <SessionActions session={session} />
    },
  },
]
