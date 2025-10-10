import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, RefreshCw, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "./BrandLogo";
import { SYSTEM_FOLDERS } from "../lib/emailConstants";
import type { EmailAccount, EmailThread, EmailDraft, EmailFolder } from "@shared/email-types";

interface SidebarProps {
  accounts: EmailAccount[];
  selectedAccount: string | null;
  onAccountChange: (accountId: string) => void;
  selectedFolder: EmailFolder;
  onFolderChange: (folder: EmailFolder) => void;
  threads?: EmailThread[];
  drafts?: EmailDraft[];
  onCompose: () => void;
  onSync: () => void;
}

export function Sidebar({
  accounts,
  selectedAccount,
  onAccountChange,
  selectedFolder,
  onFolderChange,
  threads,
  drafts,
  onCompose,
  onSync,
}: SidebarProps) {
  // Calculate badge counts
  const getInboxUnreadCount = () => threads?.filter((t) => t.unreadCount > 0).length || 0;
  const getDraftCount = () => drafts?.length || 0;

  // Helper to check if thread is lead (placeholder - customize based on your criteria)
  const isLeadThread = (thread: EmailThread) => {
    return thread.labels?.includes("CATEGORY_PROMOTIONS");
  };

  // Helper to check if thread is client (placeholder - customize based on your criteria)
  const isClientThread = (thread: EmailThread) => {
    return thread.labels?.includes("IMPORTANT");
  };

  return (
    <div className="w-64 border border-sidebar-border bg-sidebar flex flex-col rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-2 py-0 border-b border-border">
        <div className="flex items-center justify-between">
          <BrandLogo
            app="seedmail"
            className="ml-[10px] h-[4.375rem] sm:h-[5.25rem] -my-2 sm:-my-3 max-w-full object-contain"
            fallbackText="SeedMail"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={onCompose}
            className="hover:bg-accent"
            title="Compose new email"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Account Selector */}
      <div className="p-3 border-b border-border">
        <select
          value={selectedAccount || ""}
          onChange={(e) => onAccountChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-card text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id} className="bg-card">
              {account.email}
            </option>
          ))}
        </select>
      </div>

      {/* Folders */}
      <ScrollArea className="flex-1 h-full scrollbar-stable">
        <div className="p-2 space-y-0.5">
          {SYSTEM_FOLDERS.map((folder) => {
            const Icon = folder.icon;
            const isActive = selectedFolder === folder.id;
            const badgeCount =
              folder.id === "INBOX"
                ? getInboxUnreadCount()
                : folder.id === "DRAFT"
                  ? getDraftCount()
                  : 0;

            return (
              <button
                key={folder.id}
                onClick={() => onFolderChange(folder.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-accent text-accent-foreground border border-border kb-select-active"
                    : "hover:bg-accent/60 text-muted-foreground kb-select-hover"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-primary" : folder.color)} />
                <span className="flex-1 text-left">{folder.label}</span>
                {badgeCount > 0 && (
                  <Badge className="h-5 min-w-[20px] px-1.5 text-xs bg-primary text-primary-foreground border-0">
                    {badgeCount}
                  </Badge>
                )}
              </button>
            );
          })}

          {/* Inbox subfolders */}
          <div className="mt-1 space-y-0.5">
            {[
              { id: "INBOX_LEADS" as const, label: "Leads" },
              { id: "INBOX_CLIENTS" as const, label: "Clients" },
            ].map((f) => {
              const isActive = selectedFolder === f.id;
              const count =
                f.id === "INBOX_LEADS"
                  ? threads?.filter((t) => isLeadThread(t) && t.unreadCount > 0).length || 0
                  : threads?.filter((t) => isClientThread(t) && t.unreadCount > 0).length || 0;
              return (
                <button
                  key={f.id}
                  onClick={() => onFolderChange(f.id)}
                  className={cn(
                    "w-full flex items-center gap-3 pl-7 pr-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-accent text-accent-foreground border border-border"
                      : "hover:bg-accent/60 text-muted-foreground"
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70" />
                  <span className="flex-1 text-left">{f.label}</span>
                  {count > 0 && (
                    <Badge className="h-5 min-w-[20px] px-1.5 text-xs bg-primary text-primary-foreground border-0">
                      {count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </ScrollArea>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-border space-y-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onSync}
          className="w-full border-input hover:bg-accent hover:border-border"
          disabled={!selectedAccount}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Sync
        </Button>
        <Button variant="ghost" size="sm" className="w-full hover:bg-accent">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>
    </div>
  );
}
