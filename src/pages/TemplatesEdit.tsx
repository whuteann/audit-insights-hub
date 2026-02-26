import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Minimize2,
  Maximize2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { DOCUMENT_SOURCE_PATH_GROUPS } from "@/lib/documentSourcePaths";
import {
  Select,
  SelectGroup,
  SelectLabel,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TemplateItem = {
  id: string;
  name: string;
  content: any[];
  section_rules_id: string | null;
  section_id: string | null;
  section: string | null;
  title: string | null;
  description: string | null;
  template_group_id: string | null;
  sort_order: number;
  updated_at: string | null;
};

type BlockType = "paragraph" | "bullet_list" | "table" | "appendix_ref" | "subheading";
type TextBlockType = "paragraph" | "appendix_ref" | "subheading";

type EditableBlock = {
  id: string;
  name: string;
  type: BlockType;
  textByType: Record<TextBlockType, string>;
  bulletItems: string[];
  tableValue: string;
  shade: string;
  minimized: boolean;
};

type TemplatePlaceholder = {
  id: string;
  placeholder_key: string;
  source_path: string;
};

const BLOCK_TYPES: BlockType[] = [
  "paragraph",
  "bullet_list",
  "appendix_ref",
  "subheading",
];

const SHADE_BASE = 72;
const SHADE_STEP = 7;
const SHADE_MAX = 92;

function shadeForIndex(index: number): string {
  const lightness = Math.min(SHADE_BASE + index * SHADE_STEP, SHADE_MAX);
  return `hsl(220 10% ${lightness}%)`;
}

function rebalanceBlockShades(blocks: EditableBlock[]): EditableBlock[] {
  return blocks.map((block, index) => ({ ...block, shade: shadeForIndex(index) }));
}

function toEditableBlocks(content: any[]): EditableBlock[] {
  if (!Array.isArray(content) || content.length === 0) {
    return [
      {
        id: `${Date.now()}_0`,
        name: "Section 1",
        type: "paragraph",
        textByType: {
          paragraph: "",
          appendix_ref: "",
          subheading: "",
        },
        bulletItems: [],
        tableValue: '{\n  "columns": [],\n  "rows": []\n}',
        shade: shadeForIndex(0),
        minimized: false,
      },
    ];
  }
  return content.map((block, index) => {
    const type = (block?.type ?? "paragraph") as BlockType;
    const fallbackName = `Block ${index + 1}`;
    const name =
      typeof block?.name === "string" && block.name.trim()
        ? block.name
        : fallbackName;
    const textByType: Record<TextBlockType, string> = {
      paragraph: "",
      appendix_ref: "",
      subheading: "",
    };
    if (
      (type === "paragraph" || type === "appendix_ref" || type === "subheading") &&
      typeof block?.content === "string"
    ) {
      textByType[type] = block.content;
    }
    const bulletItems = Array.isArray(block?.items)
      ? block.items.map((item: unknown) => String(item))
      : [];
    const tableValue =
      type === "table"
        ? JSON.stringify({ columns: block?.columns ?? [], rows: block?.rows ?? [] }, null, 2)
        : '{\n  "columns": [],\n  "rows": []\n}';

    return {
      id: `${Date.now()}_${index}`,
      name,
      type,
      textByType,
      bulletItems,
      tableValue,
      shade: shadeForIndex(index),
      minimized: false,
    };
  });
}

export default function TemplatesEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:9000";

  const [template, setTemplate] = useState<TemplateItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [blocks, setBlocks] = useState<EditableBlock[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placeholders, setPlaceholders] = useState<TemplatePlaceholder[]>([]);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    fetch(`${apiBase}/templates/${id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        setTemplate(data);
        setDraftName(data.name ?? "");
        setBlocks(rebalanceBlockShades(toEditableBlocks(data.content ?? [])));
        setIsEditingTitle(false);
        return fetch(`${apiBase}/templates/${id}/placeholders`)
          .then((res) => (res.ok ? res.json() : []))
          .then((placeholderRows) => {
            setPlaceholders(Array.isArray(placeholderRows) ? placeholderRows : []);
          });
      })
      .catch((err) => {
        console.error("Failed to load template", err);
        setError("Failed to load template.");
      })
      .finally(() => setIsLoading(false));
  }, [apiBase, id]);

  const saveTemplate = async () => {
    if (!template) return;
    setError(null);

    const parsed: any[] = [];
    try {
      for (const block of blocks) {
        if (!block.name.trim()) {
          setError("Each block must have a name.");
          return;
        }
        if (block.type === "bullet_list") {
          parsed.push({
            name: block.name.trim(),
            type: "bullet_list",
            items: block.bulletItems
              .map((line) => line.trim())
              .filter(Boolean),
          });
          continue;
        }
        if (block.type === "table") {
          let tablePayload: any = null;
          try {
            tablePayload = JSON.parse(block.tableValue || "{}");
          } catch {
            setError("Invalid table JSON block. Use {\"columns\": [], \"rows\": []} format.");
            return;
          }
          parsed.push({
            name: block.name.trim(),
            type: "table",
            columns: Array.isArray(tablePayload.columns) ? tablePayload.columns : [],
            rows: Array.isArray(tablePayload.rows) ? tablePayload.rows : [],
          });
          continue;
        }
        parsed.push({
          name: block.name.trim(),
          type: block.type,
          content: block.textByType[block.type as TextBlockType] ?? "",
        });
      }
    } catch {
      setError("Failed to parse blocks.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`${apiBase}/templates/${template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draftName.trim() || template.name,
          content: parsed,
        }),
      });
      if (!res.ok) throw new Error("Failed to save template");
      const normalizedPlaceholders = placeholders
        .map((item) => ({
          placeholder_key: item.placeholder_key.trim().toUpperCase(),
          source_path: item.source_path.trim(),
        }))
        .filter((item) => item.placeholder_key && item.source_path);
      const invalid = normalizedPlaceholders.some((item) => !/^\[[A-Z0-9_]+\]$/.test(item.placeholder_key));
      if (invalid) {
        throw new Error("Placeholder key must match [UPPER_SNAKE_CASE]");
      }
      const placeholdersRes = await fetch(`${apiBase}/templates/${template.id}/placeholders`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeholders: normalizedPlaceholders }),
      });
      if (!placeholdersRes.ok) throw new Error("Failed to save placeholders");
      const updated = await res.json();
      setTemplate((prev) => (prev ? { ...prev, ...updated } : prev));
      setBlocks((prev) => rebalanceBlockShades(prev));
      setIsEditingTitle(false);
      setPlaceholders((prev) =>
        prev.map((item) => ({
          ...item,
          placeholder_key: item.placeholder_key.trim().toUpperCase(),
        }))
      );
      toast({
        title: "Template saved",
        description: "Changes were saved successfully.",
      });
    } catch (err) {
      console.error("Failed to save template", err);
      setError("Failed to save template.");
      toast({
        title: "Save failed",
        description: "Unable to save template changes.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const cancelTitleEdit = () => {
    setDraftName(template?.name ?? "");
    setIsEditingTitle(false);
  };

  const addBlock = () => {
    const nextShade = (() => {
      if (blocks.length === 0) return shadeForIndex(0);
      const currentMaxLightness = blocks.reduce((max, block) => {
        const match = /(\d+(?:\.\d+)?)%\)$/.exec(block.shade);
        const value = match ? Number(match[1]) : SHADE_BASE;
        return Math.max(max, value);
      }, SHADE_BASE);
      const nextLightness = Math.min(currentMaxLightness + SHADE_STEP, SHADE_MAX);
      return `hsl(220 10% ${nextLightness}%)`;
    })();
    setBlocks((prev) => [
      ...prev,
      {
        id: `${Date.now()}_${prev.length}`,
        name: `Block ${prev.length + 1}`,
        type: "paragraph",
        textByType: {
          paragraph: "",
          appendix_ref: "",
          subheading: "",
        },
        bulletItems: [],
        tableValue: '{\n  "columns": [],\n  "rows": []\n}',
        shade: nextShade,
        minimized: false,
      },
    ]);
  };

  const allMinimized = blocks.length > 0 && blocks.every((block) => block.minimized);
  const toggleAllMinimized = () => {
    setBlocks((prev) => prev.map((block) => ({ ...block, minimized: !allMinimized })));
  };

  const moveBlock = (fromId: string, toId: string) => {
    setBlocks((prev) => {
      const fromIndex = prev.findIndex((b) => b.id === fromId);
      const toIndex = prev.findIndex((b) => b.id === toId);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Edit Template</h1>
          <p className="text-sm text-muted-foreground">
            {template
              ? template.section_id && template.title
                ? `${template.section_id} ${template.title}`
                : "Industry Analysis Template"
              : "Loading template..."}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/templates")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Templates
        </Button>
      </div>

      {isLoading ? (
        <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Loading...</div>
      ) : (
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="border-b pb-4">
            {isEditingTitle ? (
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">Template title</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    className="max-w-2xl"
                  />
                  <Button size="sm" variant="outline" onClick={cancelTitleEdit}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-2xl font-semibold leading-tight">
                  {draftName || template?.name || "Untitled template"}
                </h2>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditingTitle(true)}
                  className="shrink-0"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit title
                </Button>
              </div>
            )}
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Placeholder mappings</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setPlaceholders((prev) => [
                    ...prev,
                    { id: `${Date.now()}_${prev.length}`, placeholder_key: "[KEY]", source_path: "" },
                  ])
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Add key
              </Button>
            </div>
            <div className="space-y-2">
              {placeholders.length === 0 ? (
                <p className="text-xs text-muted-foreground">No placeholders configured.</p>
              ) : null}
              {placeholders.map((placeholder) => (
                <div key={placeholder.id} className="grid gap-2 rounded-md border p-3 md:grid-cols-[220px_1fr_auto]">
                  <Input
                    value={placeholder.placeholder_key}
                    onChange={(e) =>
                      setPlaceholders((prev) =>
                        prev.map((entry) =>
                          entry.id === placeholder.id
                            ? { ...entry, placeholder_key: e.target.value.toUpperCase() }
                            : entry
                        )
                      )
                    }
                    placeholder="[COMPANY_NAME]"
                  />
                  <Select
                    value={placeholder.source_path}
                    onValueChange={(value) =>
                      setPlaceholders((prev) =>
                        prev.map((entry) =>
                          entry.id === placeholder.id ? { ...entry, source_path: value } : entry
                        )
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose source value" />
                    </SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_SOURCE_PATH_GROUPS.map((group) => (
                        <SelectGroup key={group.label}>
                          <SelectLabel>{group.label}</SelectLabel>
                          {group.options.map((opt) => (
                            <SelectItem key={`${group.label}_${opt.value}`} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setPlaceholders((prev) => prev.filter((entry) => entry.id !== placeholder.id))
                    }
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-border/80 pt-4" />
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Template blocks</Label>
              <Button type="button" variant="outline" size="sm" onClick={addBlock}>
                <Plus className="mr-2 h-4 w-4" />
                Add block
              </Button>
            </div>
            <div className="relative">
              <div className="sticky top-5 z-40 mb-3 flex justify-end">
                <Button
                  type="button"
                  variant="default"
                  size="lg"
                  onClick={toggleAllMinimized}
                  title={allMinimized ? "Expand all blocks" : "Minimize all blocks"}
                  className="h-12 rounded-full px-6 text-sm font-semibold shadow-2xl ring-2 ring-primary/40"
                >
                  {allMinimized ? (
                    <>
                      <Maximize2 className="mr-2 h-5 w-5" />
                      Expand all sections
                    </>
                  ) : (
                    <>
                      <Minimize2 className="mr-2 h-5 w-5" />
                      Minimize all sections
                    </>
                  )}
                </Button>
              </div>
              <div className="space-y-3">
                {blocks.map((block, index) => (
                  <div
                    key={block.id}
                    draggable
                    onDragStart={() => setDraggingId(block.id)}
                    onDragEnd={() => setDraggingId(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggingId) moveBlock(draggingId, block.id);
                      setDraggingId(null);
                    }}
                    className={`rounded-md border transition-colors ${draggingId === block.id ? "opacity-60" : ""
                      }`}
                    style={{ backgroundColor: block.shade }}
                  >
                    <div className={`flex items-center justify-between gap-3 ${block.minimized ? "p-2" : "p-3 pb-0"}`}>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                        <GripVertical className="h-4 w-4 cursor-grab" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBlocks((prev) =>
                              prev.map((item) =>
                                item.id === block.id ? { ...item, minimized: !item.minimized } : item
                              )
                            );
                          }}
                          className="rounded p-0.5 hover:bg-black/5"
                          aria-label={block.minimized ? "Expand block" : "Minimize block"}
                        >
                          {block.minimized ? (
                            <ChevronRight className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                        <span className="truncate">{block.name || "Untitled"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {block.minimized ? (
                          <span className="text-[11px] uppercase text-muted-foreground">{block.type}</span>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setBlocks((prev) => prev.filter((item) => item.id !== block.id))
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    {!block.minimized ? (
                      <div className="space-y-3 p-3 pt-2">
                        <div className="grid gap-2">
                          <Label>Name</Label>
                          <Input
                            value={block.name}
                            onChange={(e) =>
                              setBlocks((prev) =>
                                prev.map((item) =>
                                  item.id === block.id
                                    ? { ...item, name: e.target.value }
                                    : item
                                )
                              )
                            }
                            placeholder="Block name"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Type</Label>
                          <Select
                            value={block.type}
                            onValueChange={(value) =>
                              setBlocks((prev) =>
                                prev.map((item) =>
                                  item.id === block.id ? { ...item, type: value as BlockType } : item
                                )
                              )
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {BLOCK_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>{block.type === "bullet_list" ? "Items" : "Content"}</Label>
                          {block.type === "bullet_list" ? (
                            <div className="space-y-2">
                              {block.bulletItems.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No items yet.</p>
                              ) : null}
                              {block.bulletItems.map((item, itemIndex) => (
                                <div key={`${block.id}_item_${itemIndex}`} className="flex items-center gap-2">
                                  <Input
                                    value={item}
                                    onChange={(e) =>
                                      setBlocks((prev) =>
                                        prev.map((entry) =>
                                          entry.id === block.id
                                            ? {
                                              ...entry,
                                              bulletItems: entry.bulletItems.map((bullet, idx) =>
                                                idx === itemIndex ? e.target.value : bullet
                                              ),
                                            }
                                            : entry
                                        )
                                      )
                                    }
                                    placeholder={`Item ${itemIndex + 1}`}
                                  />
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    onClick={() =>
                                      setBlocks((prev) =>
                                        prev.map((entry) =>
                                          entry.id === block.id
                                            ? {
                                              ...entry,
                                              bulletItems: entry.bulletItems.filter((_, idx) => idx !== itemIndex),
                                            }
                                            : entry
                                        )
                                      )
                                    }
                                    aria-label="Remove item"
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setBlocks((prev) =>
                                    prev.map((entry) =>
                                      entry.id === block.id
                                        ? { ...entry, bulletItems: [...entry.bulletItems, ""] }
                                        : entry
                                    )
                                  )
                                }
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Add item
                              </Button>
                            </div>
                          ) : (
                            <Textarea
                              value={
                                block.type === "table"
                                  ? block.tableValue
                                  : block.textByType[block.type as TextBlockType] ?? ""
                              }
                              onChange={(e) =>
                                setBlocks((prev) =>
                                  prev.map((item) => {
                                    if (item.id !== block.id) return item;
                                    if (block.type === "table") {
                                      return { ...item, tableValue: e.target.value };
                                    }
                                    return {
                                      ...item,
                                      textByType: {
                                        ...item.textByType,
                                        [block.type as TextBlockType]: e.target.value,
                                      },
                                    };
                                  })
                                )
                              }
                              className="font-mono text-xs min-h-[140px]"
                              placeholder={
                                block.type === "table"
                                  ? '{\"columns\": [\"\"], \"rows\": [[\"\"]]}'
                                  : "Enter text"
                              }
                            />
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end">
            <Button onClick={saveTemplate} disabled={isSaving || !template}>
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
