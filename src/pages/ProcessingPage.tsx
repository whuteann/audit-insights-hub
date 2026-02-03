import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function ProcessingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/companies/processed");
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="page-container flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="relative inline-block">
              <FileSpreadsheet className="w-16 h-16 text-muted-foreground" />
            </div>
            
            <h2 className="text-xl font-semibold mt-6 text-foreground">
              Processing Your File
            </h2>
            <p className="text-muted-foreground mt-2">
              Extracting company data from your Excel file...
            </p>

            <div className="mt-6 space-y-2">
              <ProcessingStep label="Reading file" status="complete" />
              <ProcessingStep label="Parsing data" status="processing" />
              <ProcessingStep label="Validating entries" status="pending" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProcessingStep({ 
  label, 
  status 
}: { 
  label: string; 
  status: "complete" | "processing" | "pending" 
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      {status === "complete" && (
        <CheckCircle2 className="w-4 h-4 text-status-generated" />
      )}
      {status === "processing" && (
        <Loader2 className="w-4 h-4 text-accent animate-spin" />
      )}
      {status === "pending" && (
        <div className="w-4 h-4 rounded-full border-2 border-muted" />
      )}
      <span className={status === "pending" ? "text-muted-foreground" : "text-foreground"}>
        {label}
      </span>
    </div>
  );
}
