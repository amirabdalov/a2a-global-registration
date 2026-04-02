import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { FileText, Upload, CheckCircle2, Clock, AlertCircle, Shield } from "lucide-react";

const kycSteps = ["Not Started", "Documents Submitted", "Under Review", "Verified"];

const documents = [
  { id: "pan", name: "PAN Card", description: "Permanent Account Number card", icon: FileText },
  { id: "aadhaar", name: "Aadhaar / Passport", description: "Government-issued ID proof", icon: Shield },
  { id: "upi", name: "UPI ID", description: "Unified Payments Interface identifier", icon: FileText },
  { id: "bank", name: "Bank Details", description: "Bank account information for payouts", icon: FileText },
];

export default function KycPage() {
  const { toast } = useToast();
  const [currentStep] = useState(0);
  const [docStatuses, setDocStatuses] = useState<Record<string, "none" | "pending" | "approved" | "rejected">>({
    pan: "none", aadhaar: "none", upi: "none", bank: "none",
  });

  const handleUpload = (docId: string) => {
    setDocStatuses(prev => ({ ...prev, [docId]: "pending" }));
    toast({ title: `${docId.toUpperCase()} uploaded successfully` });
  };

  const handleSubmit = () => {
    const allUploaded = Object.values(docStatuses).every(s => s !== "none");
    if (!allUploaded) {
      toast({ title: "Please upload all required documents", variant: "destructive" });
      return;
    }
    toast({ title: "Documents submitted for review" });
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "approved": return <Badge variant="secondary" className="bg-[#22C55E]/10 text-[#22C55E]"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected": return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default: return <Badge variant="outline" className="text-muted-foreground">Not uploaded</Badge>;
    }
  };

  const progress = (currentStep / (kycSteps.length - 1)) * 100;

  return (
    <div className="p-6 space-y-6 max-w-3xl overflow-y-auto h-full" data-testid="page-kyc">
      <div>
        <h1 className="text-xl font-semibold" data-testid="heading-kyc">KYC & Documents</h1>
        <p className="text-sm text-muted-foreground">Complete your identity verification to start earning</p>
      </div>

      {/* Status Tracker */}
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4">
            <Progress value={progress} className="h-2" data-testid="progress-kyc" />
          </div>
          <div className="flex justify-between">
            {kycSteps.map((step, i) => (
              <div key={step} className={`flex flex-col items-center text-center ${i <= currentStep ? "text-primary" : "text-muted-foreground"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium mb-1 ${
                  i < currentStep ? "bg-[#22C55E] text-white" :
                  i === currentStep ? "bg-primary text-white" :
                  "bg-muted"
                }`}>
                  {i < currentStep ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className="text-xs max-w-[80px]">{step}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Document Upload Cards */}
      <div className="grid gap-4">
        {documents.map(doc => (
          <Card key={doc.id} data-testid={`card-doc-${doc.id}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <doc.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{doc.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {statusBadge(docStatuses[doc.id])}
                  {docStatuses[doc.id] === "none" && (
                    <Button size="sm" variant="outline" onClick={() => handleUpload(doc.id)} data-testid={`button-upload-${doc.id}`}>
                      <Upload className="w-3 h-3 mr-1" /> Upload
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button onClick={handleSubmit} data-testid="button-submit-kyc" className="w-full sm:w-auto">
        Submit for Review
      </Button>
    </div>
  );
}
