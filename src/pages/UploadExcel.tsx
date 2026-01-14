import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, ArrowLeft, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/PageHeader";

export default function UploadExcel() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

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

  const handleUpload = () => {
    if (selectedFile) {
      navigate("/companies/processing");
    }
  };

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
            Supported formats: .xlsx, .xls, .csv
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
                accept=".xlsx,.xls,.csv"
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

      <div className="flex items-center justify-between mt-6">
        <Button variant="outline" onClick={() => navigate("/companies")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleUpload} disabled={!selectedFile}>
          <Upload className="w-4 h-4 mr-2" />
          Upload
        </Button>
      </div>
    </div>
  );
}
