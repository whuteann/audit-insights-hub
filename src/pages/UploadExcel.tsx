import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, ArrowLeft, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import ProcessingPage from "@/pages/ProcessingPage";

export default function UploadExcel() {
  const navigate = useNavigate();
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:9000";
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    target_description: "",
    keyword: "",
    region: "",
    industry: "",
    status_filter: "",
    revenue_min: "",
    revenue_max: "",
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    if (!form.company_name.trim() || !form.target_description.trim()) {
      toast({
        title: "Missing required fields",
        description: "Company name and target description are required.",
        variant: "destructive",
      });
      return;
    }
    try {
      setIsSubmitting(true);
      const body = new FormData();
      body.append("file", selectedFile);
      body.append("company_name", form.company_name.trim());
      body.append("target_description", form.target_description.trim());
      if (form.keyword.trim()) body.append("keyword", form.keyword.trim());
      if (form.region.trim()) body.append("region", form.region.trim());
      if (form.industry.trim()) body.append("industry", form.industry.trim());
      if (form.status_filter.trim()) body.append("status_filter", form.status_filter.trim());
      if (form.revenue_min.trim()) body.append("revenue_min", form.revenue_min.trim());
      if (form.revenue_max.trim()) body.append("revenue_max", form.revenue_max.trim());

      const res = await fetch(`${apiBase}/benchmark/analyze`, {
        method: "POST",
        body,
      });
      if (!res.ok) {
        let detail = "Unable to start analysis.";
        try {
          const payload = await res.json();
          detail = payload?.detail || detail;
        } catch {
          // ignore json parse error
        }
        throw new Error(detail);
      }
      const analysis = await res.json();
      toast({
        title: "Analysis started",
        description: "Benchmark analysis request submitted.",
      });
      navigate(`/companies/analyses/${encodeURIComponent(analysis?.id ?? "")}`);
    } catch (error) {
      console.error(error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unable to submit benchmark analysis.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitting) {
    return <ProcessingPage />;
  }

  return (
    <div className="page-container max-w-2xl mx-auto">
      <PageHeader
        title="Upload Company List"
        description="Upload an Excel file containing company data for screening"
      />

      <Card>
        <CardHeader>
          <CardTitle>Select File</CardTitle>
          <CardDescription>
            Supported formats: .xlsx, .xls
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? "border-accent bg-accent/5"
                : "border-border hover:border-muted-foreground/50"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            
            {selectedFile ? (
              <div>
                <p className="text-foreground font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-foreground">Drag and drop your file here</p>
                <p className="text-sm text-muted-foreground mt-1">or</p>
              </div>
            )}

            <label className="inline-block mt-4">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="sr-only"
              />
              <span className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 cursor-pointer transition-colors">
                Browse Files
              </span>
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Benchmark Inputs</CardTitle>
          <CardDescription>Provide analysis inputs for benchmark processing.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="company_name">Company Name *</Label>
            <Input
              id="company_name"
              value={form.company_name}
              onChange={(e) => setForm((prev) => ({ ...prev, company_name: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="target_description">Target Description *</Label>
            <Textarea
              id="target_description"
              value={form.target_description}
              onChange={(e) => setForm((prev) => ({ ...prev, target_description: e.target.value }))}
              className="min-h-24"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="keyword">Keyword</Label>
              <Input
                id="keyword"
                value={form.keyword}
                onChange={(e) => setForm((prev) => ({ ...prev, keyword: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="region">Region</Label>
              <Input
                id="region"
                value={form.region}
                onChange={(e) => setForm((prev) => ({ ...prev, region: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={form.industry}
                onChange={(e) => setForm((prev) => ({ ...prev, industry: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status_filter">Status Filter</Label>
              <Input
                id="status_filter"
                value={form.status_filter}
                onChange={(e) => setForm((prev) => ({ ...prev, status_filter: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="revenue_min">Revenue Min</Label>
              <Input
                id="revenue_min"
                value={form.revenue_min}
                onChange={(e) => setForm((prev) => ({ ...prev, revenue_min: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="revenue_max">Revenue Max</Label>
              <Input
                id="revenue_max"
                value={form.revenue_max}
                onChange={(e) => setForm((prev) => ({ ...prev, revenue_max: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between mt-6">
        <Button variant="outline" onClick={() => navigate("/companies")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleUpload} disabled={!selectedFile || isSubmitting}>
          <Upload className="w-4 h-4 mr-2" />
          {isSubmitting ? "Uploading..." : "Upload"}
        </Button>
      </div>
    </div>
  );
}
