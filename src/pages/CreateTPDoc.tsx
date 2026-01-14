import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/ui/PageHeader";
import { WizardStepper } from "@/components/wizard/WizardStepper";
import { TPDocReviewModal } from "@/components/modals/TPDocReviewModal";

const wizardSteps = [
  { id: "company", title: "Company Info" },
  { id: "transactions", title: "Transactions" },
  { id: "analysis", title: "Analysis" },
  { id: "review", title: "Review" },
];

export default function CreateTPDoc() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("id");
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    companyName: editId ? "Acme Corporation" : "",
    fiscalYear: editId ? "2024" : "",
    jurisdiction: editId ? "United States" : "",
    transactionDescription: editId ? "Intercompany licensing agreement" : "",
    relatedParties: editId ? "Acme Corp US, Acme Corp UK, Acme Corp Germany" : "",
    transactionValue: editId ? "5,000,000" : "",
    methodology: editId ? "Comparable Uncontrolled Price (CUP)" : "",
    comparables: editId ? "3 comparable transactions identified" : "",
    conclusion: editId ? "Arm's length pricing confirmed" : "",
  });

  const handleNext = () => {
    if (currentStep === wizardSteps.length - 1) {
      setIsReviewModalOpen(true);
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, wizardSteps.length - 1));
    }
  };

  const handleBack = () => {
    if (currentStep === 0) {
      navigate("/tp-docs");
    } else {
      setCurrentStep((prev) => Math.max(prev - 1, 0));
    }
  };

  const handleSaveDraft = () => {
    alert("Draft saved successfully!");
    navigate("/tp-docs");
  };

  const updateFormField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => updateFormField("companyName", e.target.value)}
                    placeholder="Enter company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fiscalYear">Fiscal Year</Label>
                  <Input
                    id="fiscalYear"
                    value={formData.fiscalYear}
                    onChange={(e) => updateFormField("fiscalYear", e.target.value)}
                    placeholder="e.g., 2024"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="jurisdiction">Jurisdiction</Label>
                <Input
                  id="jurisdiction"
                  value={formData.jurisdiction}
                  onChange={(e) => updateFormField("jurisdiction", e.target.value)}
                  placeholder="Primary tax jurisdiction"
                />
              </div>
            </CardContent>
          </Card>
        );

      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Transaction Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="transactionDescription">Transaction Description</Label>
                <Textarea
                  id="transactionDescription"
                  value={formData.transactionDescription}
                  onChange={(e) => updateFormField("transactionDescription", e.target.value)}
                  placeholder="Describe the controlled transaction"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="relatedParties">Related Parties</Label>
                <Input
                  id="relatedParties"
                  value={formData.relatedParties}
                  onChange={(e) => updateFormField("relatedParties", e.target.value)}
                  placeholder="List related parties involved"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transactionValue">Transaction Value</Label>
                <Input
                  id="transactionValue"
                  value={formData.transactionValue}
                  onChange={(e) => updateFormField("transactionValue", e.target.value)}
                  placeholder="Total value in USD"
                />
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Transfer Pricing Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="methodology">Pricing Methodology</Label>
                <Input
                  id="methodology"
                  value={formData.methodology}
                  onChange={(e) => updateFormField("methodology", e.target.value)}
                  placeholder="e.g., CUP, TNMM, Profit Split"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="comparables">Comparable Analysis</Label>
                <Textarea
                  id="comparables"
                  value={formData.comparables}
                  onChange={(e) => updateFormField("comparables", e.target.value)}
                  placeholder="Describe comparable transactions or companies"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="conclusion">Conclusion</Label>
                <Textarea
                  id="conclusion"
                  value={formData.conclusion}
                  onChange={(e) => updateFormField("conclusion", e.target.value)}
                  placeholder="Summary of arm's length analysis"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Review Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Company Name</p>
                    <p className="text-foreground">{formData.companyName || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Fiscal Year</p>
                    <p className="text-foreground">{formData.fiscalYear || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Jurisdiction</p>
                    <p className="text-foreground">{formData.jurisdiction || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Transaction Value</p>
                    <p className="text-foreground">{formData.transactionValue || "-"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Methodology</p>
                  <p className="text-foreground">{formData.methodology || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Conclusion</p>
                  <p className="text-foreground">{formData.conclusion || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="page-container max-w-4xl mx-auto">
      <PageHeader
        title={editId ? "Edit TP Document" : "Create TP Document"}
        description="Complete each step to generate your transfer pricing documentation"
      />

      <WizardStepper steps={wizardSteps} currentStep={currentStep} />

      {renderStepContent()}

      <div className="flex items-center justify-between mt-6">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {currentStep === 0 ? "Cancel" : "Back"}
        </Button>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleSaveDraft}>
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          <Button onClick={handleNext}>
            {currentStep === wizardSteps.length - 1 ? "Review & Submit" : "Next"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      <TPDocReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        document={{
          id: editId || "new",
          companyName: formData.companyName,
          status: "draft",
          lastUpdated: new Date().toISOString().split("T")[0],
        }}
      />
    </div>
  );
}
