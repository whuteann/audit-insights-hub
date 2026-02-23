import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

type SectionRuleItem = {
  id: string;
  section_id: string;
  section: string;
  title: string;
  description: string | null;
};

export default function AssemblyStructure() {
  const navigate = useNavigate();
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:9000";
  const [items, setItems] = useState<SectionRuleItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetch(`${apiBase}/templates/section-rules`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Failed to load section rules", err))
      .finally(() => setIsLoading(false));
  }, [apiBase]);

  const grouped = useMemo(() => {
    const map: Record<string, SectionRuleItem[]> = {};
    for (const item of items) {
      if (item.section === "4") continue;
      if (!map[item.section]) map[item.section] = [];
      map[item.section].push(item);
    }
    Object.values(map).forEach((rows) => rows.sort((a, b) => a.section_id.localeCompare(b.section_id)));
    return Object.entries(map).sort((a, b) => Number(a[0]) - Number(b[0]));
  }, [items]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Global Structure</h1>
          <p className="text-sm text-muted-foreground">
            Configure assembly logic by section rule.
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading sections…</div>
        ) : grouped.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No section rules found.</div>
        ) : (
          <div className="divide-y">
            {grouped.map(([section, rows]) => (
              <div key={section} className="p-4 space-y-3">
                <h2 className="text-sm font-semibold">Section {section}</h2>
                <div className="rounded-md border">
                  <div className="grid grid-cols-[120px_1fr_120px] gap-3 border-b px-3 py-2 text-xs uppercase text-muted-foreground">
                    <div>Section Id</div>
                    <div>Title</div>
                    <div className="text-right">Actions</div>
                  </div>
                  <div className="divide-y">
                    {rows.map((row) => (
                      <div key={row.id} className="grid grid-cols-[120px_1fr_120px] gap-3 px-3 py-2 text-sm">
                        <div className="font-medium">{row.section_id}</div>
                        <div>{row.title}</div>
                        <div className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/assembly/sections/${row.id}`)}
                          >
                            Edit
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
