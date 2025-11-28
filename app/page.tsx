"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { useCreateStreamSession, useGetStreamSessions } from "./misc/api";
import { PaginatedDataTable } from "@/components/ui/paginated-data-table";
import { streamSessionColumns } from "@/components/stream-sessions-columns";
import { useRouter } from "next/navigation";

export default function Home() {
  const [currentUrl, setCurrentUrl] = useState<string | undefined>(undefined);
  const router = useRouter();
  const { data, isLoading, refetch } = useGetStreamSessions(currentUrl);
  const { mutate: createSession, isPending } = useCreateStreamSession();
  
  const handleCreateSession = () => {
    createSession(undefined, {
      onSuccess: (response) => {
        // Route to create-stream page with the new session ID
        router.push(`/create-stream?sessionId=${response.session_id}`);
      },
    });
  };

  const handleRefresh = () => {
    setCurrentUrl(undefined); // Reset to first page
    refetch();
  };

  const handleNextPage = () => {
    if (data?.next) {
      try {
        // Check if it's a full URL or relative path
        if (data.next.startsWith('http')) {
          const url = new URL(data.next);
          setCurrentUrl(url.pathname + url.search);
        } else {
          setCurrentUrl(data.next);
        }
      } catch {
        // Fallback: use the URL as is
        setCurrentUrl(data.next);
      }
    }
  };

  const handlePreviousPage = () => {
    if (data?.previous) {
      try {
        // Check if it's a full URL or relative path
        if (data.previous.startsWith('http')) {
          const url = new URL(data.previous);
          setCurrentUrl(url.pathname + url.search);
        } else {
          setCurrentUrl(data.previous);
        }
      } catch {
        // Fallback: use the URL as is
        setCurrentUrl(data.previous);
      }
    } else {
      // Go back to first page if no previous URL
      setCurrentUrl(undefined);
    }
  };

  // Calculate current page number from URL
  const getCurrentPage = () => {
    if (!currentUrl) return 1;
    try {
      // Handle both full URLs and relative paths
      let searchParams: URLSearchParams;
      
      if (currentUrl.startsWith('http')) {
        const url = new URL(currentUrl);
        searchParams = url.searchParams;
      } else {
        // For relative paths, just extract search params
        const [, search] = currentUrl.split('?');
        searchParams = new URLSearchParams(search || '');
      }
      
      const page = searchParams.get('page');
      return page ? parseInt(page, 10) : 1;
    } catch {
      return 1;
    }
  };

  // Estimate page size (you might want to make this configurable)
  const estimatedPageSize = 20; // Adjust based on your API's default page size

  const sessions = data?.results || [];
  const hasNoSessions = !isLoading && data && sessions.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold">Stream Sessions</CardTitle>
                <CardDescription>
                  {hasNoSessions 
                    ? "No stream sessions found. Create your first session to get started."
                    : `Manage and view your stream sessions. Total sessions: ${data?.count || 0}`
                  }
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                {!hasNoSessions && (
                  <Button
                    onClick={handleRefresh}
                    variant="outline"
                    disabled={isLoading}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                )}
                <Button
                  onClick={handleCreateSession}
                  disabled={isPending}
                  size={hasNoSessions ? "lg" : "default"}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {isPending ? 'Creating...' : hasNoSessions ? 'Create Your First Session' : 'New Session'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">Loading sessions...</div>
              </div>
            ) : hasNoSessions ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <div className="text-6xl">🎮</div>
                <h3 className="text-xl font-semibold text-muted-foreground">No Sessions Yet</h3>
                <p className="text-center text-muted-foreground max-w-md">
                  Get started by creating your first stream session. You&apos;ll be able to configure questions, 
                  upload content, and generate your game show video.
                </p>
                <Button 
                  onClick={handleCreateSession}
                  disabled={isPending}
                  size="lg"
                  className="mt-4"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  {isPending ? 'Creating Session...' : 'Create Your First Session'}
                </Button>
              </div>
            ) : (
              <PaginatedDataTable
                columns={streamSessionColumns}
                data={sessions}
                searchKey="id"
                searchPlaceholder="Search by session ID..."
                totalCount={data?.count || 0}
                hasNext={!!data?.next}
                hasPrevious={!!data?.previous}
                onNextPage={handleNextPage}
                onPreviousPage={handlePreviousPage}
                currentPage={getCurrentPage()}
                pageSize={estimatedPageSize}
                isLoading={isLoading}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
