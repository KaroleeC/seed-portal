import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Folder,
  FileText,
  ChevronLeft,
  FileSpreadsheet,
  File as FileIcon,
  Image,
  Code2,
  FileArchive,
} from "lucide-react";
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
    if (n.endsWith(".csv") || n.endsWith(".txt") || n.endsWith(".md"))
      return <FileText className="h-4 w-4" />;
    if (n.endsWith(".png") || n.endsWith(".jpg") || n.endsWith(".jpeg"))
      return <Image className="h-4 w-4" />;
    if (n.endsWith(".zip") || n.endsWith(".tar") || n.endsWith(".gz"))
      return <FileArchive className="h-4 w-4" />;
    if (n.endsWith(".json") || n.endsWith(".ts") || n.endsWith(".tsx") || n.endsWith(".js"))
      return <Code2 className="h-4 w-4" />;
    return <FileIcon className="h-4 w-4" />;
  }

  function formatBytes(bytes?: number) {
    if (!bytes && bytes !== 0) return "";
    const sizes = ["B", "KB", "MB", "GB"];
    let i = 0;
    let v = bytes;
    while (v >= 1024 && i < sizes.length - 1) {
      v /= 1024;
      i++;
    }
    return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${sizes[i]}`;
  }

  function formatDate(iso?: string) {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return "";
    }
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
        `/api/ai/box/list${id ? `?folderId=${encodeURIComponent(id)}` : ""}`
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
      <DialogContent className="sm:max-w-[900px] md:max-w-[1000px]">
        <DialogHeader>
          <DialogTitle>Attach from Box</DialogTitle>
        </DialogHeader>

        {/* Top bar: Back + Search */}
        <div className="flex items-center gap-2 mb-3">
          <Button variant="outline" size="sm" onClick={goBack} disabled={stack.length <= 1}>
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          <div className="flex-1" />
          <div className="ml-auto flex items-center gap-2">
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by name…"
              className="h-8 w-[240px]"
            />
          </div>
        </div>

        {error && <div className="text-red-400 text-sm mb-2">{error}</div>}

        {/* Main content: two-pane layout */}
        <div className="border rounded-md overflow-hidden">
          <div className="grid grid-cols-[320px_minmax(0,1fr)]">
            {/* Left: Folders */}
            <div className="border-r">
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                Folders
              </div>
              <div className="max-h-[56vh] overflow-auto divide-y">
                {loading && <div className="px-3 py-3 text-sm text-muted-foreground">Loading…</div>}
                {!loading &&
                  (filteredItems.filter((i) => i.type === "folder").length === 0 ? (
                    <div className="px-3 py-3 text-sm text-muted-foreground">No subfolders</div>
                  ) : (
                    filteredItems
                      .filter((i) => i.type === "folder")
                      .map((f) => (
                        <button
                          key={f.id}
                          className="w-full text-left px-3 py-2 hover:bg-muted/30 flex items-center gap-2"
                          onClick={() => loadFolder(f.id, f.name)}
                        >
                          {iconForItem(f)}
                          <span className="truncate">{f.name}</span>
                        </button>
                      ))
                  ))}
              </div>
            </div>

            {/* Right: Files table */}
            <div className="relative">
              <div className="relative max-h-[56vh] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="text-left font-medium px-3 py-2">Name</th>
                      <th className="text-right font-medium px-3 py-2 w-[110px]">Size</th>
                      <th className="text-right font-medium px-3 py-2 w-[150px]">Modified</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {loading && (
                      <tr>
                        <td colSpan={3} className="px-3 py-3 text-muted-foreground">
                          Loading…
                        </td>
                      </tr>
                    )}
                    {!loading &&
                      filteredItems.filter((i) => i.type === "file").length === 0 &&
                      !error && (
                        <tr>
                          <td colSpan={3} className="px-3 py-3 text-muted-foreground">
                            No files found in this folder.
                          </td>
                        </tr>
                      )}
                    {!loading &&
                      filteredItems
                        .filter((i) => i.type === "file")
                        .map((item) => (
                          <tr
                            key={item.id}
                            className={`hover:bg-muted/30 ${selected[item.id] ? "bg-muted/40" : ""}`}
                          >
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <input
                                  className="shrink-0"
                                  type="checkbox"
                                  checked={!!selected[item.id]}
                                  onChange={() => toggleSelect(item)}
                                />
                                {iconForItem(item)}
                                <span className="truncate">{item.name}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right text-muted-foreground">
                              {item.size !== undefined ? formatBytes(item.size) : ""}
                            </td>
                            <td className="px-3 py-2 text-right text-muted-foreground">
                              {item.modified_at ? formatDate(item.modified_at) : ""}
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          {/* Footer actions */}
          <div className="flex items-center justify-between px-3 py-2 border-t bg-background">
            <div className="text-xs text-muted-foreground">
              {Object.keys(selected).length} selected
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={attachCurrentFolder}
                disabled={!folderId}
              >
                Attach current folder
              </Button>
              <Button size="sm" onClick={attachSelected} disabled={!Object.keys(selected).length}>
                Attach selected
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
