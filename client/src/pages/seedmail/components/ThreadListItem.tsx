import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Circle, MailOpen, Paperclip, Star, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getInitials } from "../lib/emailUtils";
import { formatRelativeTime } from "../lib/emailFormatters";
import type { EmailThread } from "@shared/email-types";

interface ThreadListItemProps {
  thread: EmailThread;
  isSelected: boolean;
  onClick: () => void;
  onMarkRead?: () => void;
  onStar?: (starred: boolean) => void;
  onDelete?: () => void;
}

export function ThreadListItem({
  thread,
  isSelected,
  onClick,
  onMarkRead,
  onStar,
  onDelete,
}: ThreadListItemProps) {
  const isUnread = thread.unreadCount > 0;
  const sender = thread.participants?.[0];
  const initials = getInitials(sender?.name, sender?.email);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "group relative w-full px-4 py-3 text-left transition-all duration-150",
        "hover:bg-accent/40 border-b border-border",
        isSelected && "bg-accent border-l-4 border-l-primary",
        isUnread && "bg-accent/20"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Avatar
          className={cn(
            "h-10 w-10 flex-shrink-0 transition-all",
            isUnread && "ring-2 ring-primary ring-offset-2 ring-offset-background"
          )}
        >
          <AvatarFallback
            className={cn(
              "text-sm font-semibold",
              isUnread ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header Row */}
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                "text-sm truncate flex-1",
                isUnread ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
              )}
            >
              {sender?.name || sender?.email || "Unknown"}
            </span>

            <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
              {thread.hasAttachments && <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />}
              {/* Hover-only quick actions */}
              <div className="flex items-center gap-1 w-0 overflow-hidden opacity-0 group-hover:w-auto group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all ml-1">
                {isUnread && onMarkRead && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkRead();
                    }}
                    title="Mark as read"
                  >
                    <MailOpen className="h-3.5 w-3.5" />
                  </Button>
                )}
                {onStar && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-yellow-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStar(!thread.isStarred);
                    }}
                    title={thread.isStarred ? "Unstar" : "Star"}
                  >
                    <Star
                      className={cn(
                        "h-3.5 w-3.5",
                        thread.isStarred && "fill-yellow-400 text-yellow-400"
                      )}
                    />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                    }}
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <span
                className={cn(
                  "text-xs ml-2 whitespace-nowrap min-w-[3.75rem] text-right",
                  isUnread ? "text-primary font-medium" : "text-muted-foreground"
                )}
              >
                {formatRelativeTime(thread.lastMessageAt)}
              </span>
            </div>
          </div>

          {/* Subject */}
          <h4
            className={cn(
              "text-sm line-clamp-1 mb-1",
              isUnread ? "font-semibold text-foreground" : "text-foreground"
            )}
          >
            {thread.subject || "(No Subject)"}
          </h4>

          {/* Snippet */}
          <div className="flex items-center gap-2 min-w-0">
            <p
              className={cn(
                "text-xs line-clamp-1 flex-1 min-w-0",
                isUnread ? "text-foreground/80" : "text-muted-foreground"
              )}
            >
              {thread.snippet}
            </p>
            {isUnread && <Circle className="h-2 w-2 fill-primary text-primary flex-shrink-0" />}
          </div>
        </div>
      </div>
    </div>
  );
}
