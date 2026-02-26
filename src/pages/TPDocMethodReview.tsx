import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { deriveTransferPricingMethod } from "@/lib/transferPricingMethod";

type DraftDocumentPayload = Record<string, any>;

export default function TPDocMethodReview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const docId = searchParams.get("id");
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:9000";

  const [documentData, setDocumentData] = useState<DraftDocumentPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAssembling, setIsAssembling] = useState(false);

  useEffect(() => {
    if (!docId) return;
    setIsLoading(true);
    fetch(`${apiBase}/drafts/${docId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => setDocumentData(data ?? null))
      .catch((err) => {
        console.error("Failed to load draft for review", err);
        toast({
          title: "Load failed",
          description: "Unable to load draft details for method review.",
          variant: "destructive",
        });
      })
      .finally(() => setIsLoading(false));
  }, [apiBase, docId]);

  const derived = useMemo(() => {
    if (!documentData) return null;
    return deriveTransferPricingMethod(documentData);
  }, [documentData]);

  const confirmAndAssemble = async () => {
    if (!docId) return;
    setIsAssembling(true);
    try {
      const res = await fetch(
        `${apiBase}/draft-documents/assemble?document_id=${encodeURIComponent(docId)}`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Failed to assemble");

      toast({
        title: "Assembly complete",
        description: "Draft sections were generated successfully.",
      });
      navigate(`/tp-docs/review?id=${encodeURIComponent(docId)}&section=1`);
    } catch (err) {
      console.error("Assembly failed", err);
      toast({
        title: "Assembly failed",
        description: "Unable to assemble draft sections.",
        variant: "destructive",
      });
    } finally {
      setIsAssembling(false);
    }
  };

  if (!docId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Missing document id.</p>
            <Button className="mt-4" variant="outline" onClick={() => navigate("/tp-docs")}>Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Method Review</h1>
          <p className="text-sm text-muted-foreground">
            Review derived transfer pricing method logic before document assembly.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading review details...</p>
          ) : derived ? (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Company</p>
                  <p className="font-medium">{derived.testedParty}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Derived method</p>
                  <p className="font-medium">{derived.method}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">PLI</p>
                  <p className="font-medium">{derived.pli}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Confidence</p>
                  <p className="font-medium">{derived.confidence}%</p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-xs text-muted-foreground mb-2">Logic & reasoning</p>
                <ul className="space-y-1">
                  {derived.reasons.map((reason, idx) => (
                    <li key={`${idx}_${reason}`} className="text-sm">
                      - {reason}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No data found to derive method.</p>
          )}

          <div className="pt-2">
            <Button onClick={confirmAndAssemble} disabled={isAssembling || isLoading || !derived}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {isAssembling ? "Assembling..." : "Confirm & Assemble"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
