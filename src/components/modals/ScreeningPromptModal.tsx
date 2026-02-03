import { useState, useEffect, useMemo } from "react";
import { X, Play } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mockTPDocuments } from "@/data/mockData";

interface ScreeningPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  allowExtractedListOnly?: boolean;
}

export function ScreeningPromptModal({ 
  isOpen, 
  onClose, 
  onSubmit,
  allowExtractedListOnly = true 
}: ScreeningPromptModalProps) {
  const [description, setDescription] = useState("");
  const [screeningScope, setScreeningScope] = useState(allowExtractedListOnly ? "extracted" : "system");
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [website, setWebsite] = useState("");

  // Get unique company names from ongoing TP cases
  const companiesWithOngoingCases = useMemo(() => {
    const companyNames = new Set(
      mockTPDocuments
        .filter((doc) => doc.status === "draft" || doc.status === "generated")
        .map((doc) => doc.companyName)
    );
    return Array.from(companyNames).sort();
  }, []);

  useEffect(() => {
    // If extracted list option is disabled and current scope is "extracted", switch to "system"
    if (!allowExtractedListOnly && screeningScope === "extracted") {
      setScreeningScope("system");
    }
  }, [allowExtractedListOnly, screeningScope]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setDescription("");
      setSelectedCompany("");
      setWebsite("");
    }
  }, [isOpen]);

  const handleSubmit = () => {
    onSubmit();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Screen Companies</DialogTitle>
          </div>
          <DialogDescription>
            Define the tested party characteristics to find comparable companies.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="company-select">Select Company with Ongoing TP Case (Optional)</Label>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger id="company-select">
                <SelectValue placeholder="Select a company..." />
              </SelectTrigger>
              <SelectContent>
                {companiesWithOngoingCases.length > 0 ? (
                  companiesWithOngoingCases.map((companyName) => (
                    <SelectItem key={companyName} value={companyName}>
                      {companyName}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-companies" disabled>
                    No companies with ongoing cases
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website Url</Label>
            <Input
              id="website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Tested Party Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the tested party's business activities, functions performed, assets used, and risks assumed..."
              rows={4}
            />
          </div>

          <div className="space-y-3">
            <Label>Screening Scope</Label>
            <RadioGroup value={screeningScope} onValueChange={setScreeningScope}>
              {allowExtractedListOnly && (
                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="extracted" id="extracted" className="mt-0.5" />
                  <div className="space-y-1">
                    <Label htmlFor="extracted" className="font-medium cursor-pointer">
                      Screen against extracted list only
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Compare only with companies from your uploaded file
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="system" id="system" className="mt-0.5" />
                <div className="space-y-1">
                  <Label htmlFor="system" className="font-medium cursor-pointer">
                    Screen against entire system
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Search across all companies in the database
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            <Play className="w-4 h-4 mr-2" />
            Run Screening
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
