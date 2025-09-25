import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Folder, FileText, ChevronLeft, ChevronRight, FileSpreadsheet, File as FileIcon, Image, Code2, FileArchive } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export type BoxAttachment = {
  type: "box_file" | "box_folder";
  id: string;
  name?: string;
};

interface BoxItem {
  id: string;
  name: string;
  type: "file" | "folder";
  size?: number;
  modified_at?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (attachments: BoxAttachment[]) => void;
}

export function BoxPickerModal({ open, onOpenChange, onConfirm }: Props) {
  const [folderId, setFolderId] = useState<string | null>(null);
  const [stack, setStack] = useState<{ id: string; name: string }[]>([]);
  const [items, setItems] = useState<BoxItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Record<string, BoxItem>>({});
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const filteredItems = useMemo(() => {
    if (!filter.trim()) return items;
    const q = filter.toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, filter]);

  function iconForItem(it: BoxItem) {
    if (it.type === "folder") return <Folder className="h-4 w-4" />;
    const n = it.name.toLowerCase();
    if (n.endsWith(".xlsx") || n.endsWith(".xls")) return <FileSpreadsheet className="h-4 w-4" />;
    if (n.endsWith(".csv") || n.endsWith(".txt") || n.endsWith(".md")) return <FileText className="h-4 w-4" />;
    if (n.endsWith(".png") || n.endsWith(".jpg") || n.endsWith(".jpeg")) return <Image className="h-4 w-4" />;
    if (n.endsWith(".zip") || n.endsWith(".tar") || n.endsWith(".gz")) return <FileArchive className="h-4 w-4" />;
    if (n.endsWith(".json") || n.endsWith(".ts") || n.endsWith(".tsx") || n.endsWith(".js")) return <Code2 className="h-4 w-4" />;
    return <FileIcon className="h-4 w-4" />;
  }

  function formatBytes(bytes?: number) {
    if (!bytes && bytes !== 0) return "";
    const sizes = ["B", "KB", "MB", "GB"]; 
    let i = 0; let v = bytes;
    while (v >= 1024 && i < sizes.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${sizes[i]}`;
  }

  function formatDate(iso?: string) {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return ""; }
  }

  useEffect(() => {
    if (!open) return;
    // load root folder
    loadFolder(undefined);
    setSelected({});
  }, [open]);

  async function loadFolder(id?: string, label?: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest(
        "GET",
        `/api/ai/box/list${id ? `?folderId=${encodeURIComponent(id)}` : ""}`,
      );
      setItems(res.items || []);
      setFolderId(res.folderId);
      if (!id) {
        // Root
        setStack([{ id: res.folderId, name: "CLIENTS" }]);
      } else if (label) {
        setStack((prev) => [...prev, { id, name: label }]);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load Box folder");
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    if (stack.length <= 1) return;
    const newStack = stack.slice(0, -1);
    setStack(newStack);
    const prev = newStack[newStack.length - 1]!;
    loadFolder(prev.id, undefined);
  }

  function goToCrumb(index: number) {
    if (index < 0 || index >= stack.length) return;
    const crumb = stack[index]!;
    const newStack = stack.slice(0, index + 1);
    setStack(newStack);
    loadFolder(crumb.id, undefined);
  }

  function toggleSelect(item: BoxItem) {
    setSelected((prev) => {
      const copy = { ...prev } as Record<string, BoxItem>;
      if (copy[item.id]) delete copy[item.id];
      else copy[item.id] = item;
      return copy;
    });
  }

  function attachSelected() {
    const attachments: BoxAttachment[] = Object.values(selected).map((it) => ({
      type: it.type === "file" ? "box_file" : "box_folder",
      id: it.id,
      name: it.name,
    }));
    onConfirm(attachments);
    onOpenChange(false);
  }

  function attachCurrentFolder() {
    if (!folderId) return;
    const label = stack[stack.length - 1]?.name || "Folder";
    onConfirm([{ type: "box_folder", id: folderId, name: label }]);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Attach from Box</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goBack}
            disabled={stack.length <= 1}
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            {stack.map((s, idx) => (
              <React.Fragment key={s.id}>
                {idx > 0 && <ChevronRight className="h-3 w-3 opacity-60" />}
                <button
                  className={`hover:underline ${idx === stack.length - 1 ? 'text-foreground font-medium' : ''}`}
                  onClick={() => goToCrumb(idx)}
                >
                  {s.name}
                </button>
              </React.Fragment>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by name…"
              className="h-8 w-[220px]"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={attachCurrentFolder}
              disabled={!folderId}
            >
              Attach current folder
            </Button>
            <Button
              size="sm"
              onClick={attachSelected}
              disabled={!Object.keys(selected).length}
            >
              Attach selected
            </Button>
          </div>
        </div>

        {error && <div className="text-red-400 text-sm mb-2">{error}</div>}

        <div className="border rounded-md divide-y max-h-[420px] overflow-auto">
          {loading && (
            <div className="p-3 text-sm text-muted-foreground">Loading…</div>
          )}
          {!loading &&
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="p-2 hover:bg-muted/30 flex items-center gap-3"
              >
                {item.type === "folder" ? (
                  <button
                    className="flex items-center gap-2 text-left flex-1"
                    onClick={() => loadFolder(item.id, item.name)}
                  >
                    {iconForItem(item)}
                    <span className="truncate">{item.name}</span>
                  </button>
                ) : (
                  <button
                    className="flex items-center gap-2 text-left flex-1"
                    onClick={() => toggleSelect(item)}
                  >
                    {iconForItem(item)}
                    <span className="truncate">{item.name}</span>
                  </button>
                )}
                <div className="ml-auto flex items-center gap-4 text-xs text-muted-foreground">
                  {item.size !== undefined && item.type === 'file' && (
                    <span>{formatBytes(item.size)}</span>
                  )}
                  {item.modified_at && (
                    <span>{formatDate(item.modified_at)}</span>
                  )}
                </div>
                {item.type === "file" && (
                  <input
                    type="checkbox"
                    checked={!!selected[item.id]}
                    onChange={() => toggleSelect(item)}
                  />
                )}
              </div>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
