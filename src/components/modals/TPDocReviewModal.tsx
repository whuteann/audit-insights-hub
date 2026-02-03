import { useState } from "react";
import { X, RefreshCw, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TPDocument } from "@/data/mockData";

interface TPDocReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: TPDocument | null;
}

export function TPDocReviewModal({ isOpen, onClose, document }: TPDocReviewModalProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);

  if (!document) return null;

  const handleRegenerate = () => {
    setIsRegenerating(true);
    setTimeout(() => {
      setIsRegenerating(false);
    }, 2000);
  };

  const handleSave = () => {
    alert("Document saved successfully!");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle>Review TP Document - {document.companyName}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* PDF Preview */}
          <div className="w-1/2 border-r bg-muted/30 p-4">
            <div className="h-full rounded-lg border bg-card flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <div className="w-16 h-20 mx-auto mb-4 border-2 border-dashed border-muted-foreground/30 rounded flex items-center justify-center">
                  <span className="text-2xl font-bold text-muted-foreground/50">PDF</span>
                </div>
                <p className="text-sm">PDF Preview</p>
                <p className="text-xs mt-1">{document.companyName} - TP Documentation</p>
              </div>
            </div>
          </div>

          {/* Structured Input Panel */}
          <div className="w-1/2 flex flex-col">
            <Tabs defaultValue="company" className="flex-1 flex flex-col">
              <TabsList className="mx-4 mt-4 grid grid-cols-3">
                <TabsTrigger value="company">Company</TabsTrigger>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-auto p-4">
                <TabsContent value="company" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input defaultValue={document.companyName} />
                  </div>
                  <div className="space-y-2">
                    <Label>Fiscal Year</Label>
                    <Input defaultValue="2024" />
                  </div>
                  <div className="space-y-2">
                    <Label>Jurisdiction</Label>
                    <Input defaultValue="United States" />
                  </div>
                </TabsContent>

                <TabsContent value="transactions" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label>Transaction Description</Label>
                    <Textarea 
                      defaultValue="Intercompany licensing agreement for intellectual property rights"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Related Parties</Label>
                    <Input defaultValue="Parent Co, Subsidiary A, Subsidiary B" />
                  </div>
                  <div className="space-y-2">
                    <Label>Transaction Value</Label>
                    <Input defaultValue="$5,000,000" />
                  </div>
                </TabsContent>

                <TabsContent value="analysis" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label>Pricing Methodology</Label>
                    <Input defaultValue="Comparable Uncontrolled Price (CUP)" />
                  </div>
                  <div className="space-y-2">
                    <Label>Comparable Analysis</Label>
                    <Textarea 
                      defaultValue="Based on analysis of 5 comparable uncontrolled transactions in the market"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Conclusion</Label>
                    <Textarea 
                      defaultValue="The controlled transaction pricing is within the arm's length range"
                      rows={3}
                    />
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t flex items-center justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={handleRegenerate}
            disabled={isRegenerating}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRegenerating ? "animate-spin" : ""}`} />
            {isRegenerating ? "Regenerating..." : "Regenerate PDF"}
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
