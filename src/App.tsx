import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";

// TP Docs Module
import TPDocsListing from "@/pages/TPDocsListing";
import CreateTPDoc from "@/pages/CreateTPDoc";

// Companies Module
import CompanyListing from "@/pages/CompanyListing";
import UploadExcel from "@/pages/UploadExcel";
import ProcessingPage from "@/pages/ProcessingPage";
import ProcessedCompanies from "@/pages/ProcessedCompanies";
import ScreeningResults from "@/pages/ScreeningResults";

// Audit Trail Module
import AuditTrail from "@/pages/AuditTrail";

import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/tp-docs" replace />} />
            
            {/* TP Docs Module */}
            <Route path="/tp-docs" element={<TPDocsListing />} />
            <Route path="/tp-docs/create" element={<CreateTPDoc />} />
            
            {/* Companies Module */}
            <Route path="/companies" element={<CompanyListing />} />
            <Route path="/companies/upload" element={<UploadExcel />} />
            <Route path="/companies/processing" element={<ProcessingPage />} />
            <Route path="/companies/processed" element={<ProcessedCompanies />} />
            <Route path="/companies/screening-results" element={<ScreeningResults />} />
            
            {/* Audit Trail Module */}
            <Route path="/audit-trail" element={<AuditTrail />} />
          </Route>
          
          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
