import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface ScreeningPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export function ScreeningPromptModal({ isOpen, onClose, onSubmit }: ScreeningPromptModalProps) {
  const [description, setDescription] = useState("");
  const [screeningScope, setScreeningScope] = useState("extracted");

  const handleSubmit = () => {
    onSubmit();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Screen Companies</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <DialogDescription>
            Define the tested party characteristics to find comparable companies.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
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
