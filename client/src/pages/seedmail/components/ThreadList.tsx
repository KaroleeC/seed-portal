import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mail, RefreshCw, Search } from "lucide-react";
import { ThreadListItem } from "./ThreadListItem";
import type { EmailThread, EmailFolder } from "@shared/email-types";

interface ThreadListProps {
  threads?: EmailThread[];
  selectedThread: string | null;
  selectedFolder: EmailFolder;
  loading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onThreadClick: (threadId: string) => void;
  onMarkRead: (threadId: string) => void;
  onStar: (threadId: string, starred: boolean) => void;
  onDelete: (threadId: string) => void;
}

export function ThreadList({
  threads,
  selectedThread,
  selectedFolder,
  loading,
  searchQuery,
  onSearchChange,
  onThreadClick,
  onMarkRead,
  onStar,
  onDelete,
}: ThreadListProps) {
  return (
    <div className="w-96 min-h-0 border border-border flex flex-col bg-card rounded-xl overflow-hidden">
      {/* Search */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search mail..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-10 bg-input border-input text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
          />
        </div>
      </div>

      {/* Thread List */}
      <ScrollArea className="flex-1 h-full scrollbar-stable">
        {loading && (
          <div className="p-8 text-center">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading emails...</p>
          </div>
        )}

        {!loading && (!threads || threads.length === 0) && (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Mail className="h-16 w-16 mb-4 text-muted-foreground/40" />
            <h3 className="font-semibold text-lg mb-1">No emails here</h3>
            <p className="text-sm text-muted-foreground">
              Your {selectedFolder.toLowerCase()} is empty
            </p>
          </div>
        )}

        {!loading && threads && threads.length > 0 && (
          <div>
            {threads.map((thread) => (
              <ThreadListItem
                key={thread.id}
                thread={thread}
                isSelected={selectedThread === thread.id}
                onClick={() => onThreadClick(thread.id)}
                onMarkRead={() => onMarkRead(thread.id)}
                onStar={(starred) => onStar(thread.id, starred)}
                onDelete={() => onDelete(thread.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
