import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Receipt, Mail, User, ShieldCheck, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { verifyClaimSchema, type VerifyClaim, type ClaimWithItems } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface ClaimFormProps {
  onSuccess: (data: ClaimWithItems) => void;
}

export function ClaimForm({ onSuccess }: ClaimFormProps) {
  const [error, setError] = useState<string | null>(null);

  const form = useForm<VerifyClaim>({
    resolver: zodResolver(verifyClaimSchema),
    defaultValues: {
      invoiceId: "",
      email: "",
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (data: VerifyClaim) => {
      const response = await apiRequest("POST", "/api/claims/verify", data);
      return response.json();
    },
    onSuccess: (result) => {
      setError(null);
      onSuccess(result.claim);
    },
    onError: (error: any) => {
      const message = error.message || "Verification failed. Please try again.";
      setError(message);
    },
  });

  const onSubmit = (data: VerifyClaim) => {
    setError(null);
    verifyMutation.mutate(data);
  };

  return (
    <Card className="shadow-2xl border-border fade-in" data-testid="card-verification-form">
      <CardContent className="p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-card-foreground mb-3" data-testid="text-form-title">
            Claim Your Garden Items
          </h2>
          <p className="text-muted-foreground text-lg" data-testid="text-form-subtitle">
            Enter your purchase details to verify and claim your Roblox garden items
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid md:grid-cols-1 gap-6">
            <div className="space-y-2">
              <Label htmlFor="invoiceId" className="text-sm font-medium text-card-foreground">
                Invoice ID *
              </Label>
              <div className="relative">
                <Input
                  id="invoiceId"
                  {...form.register("invoiceId")}
                  placeholder="e.g., abc123def or INV-456"
                  className="pl-4 pr-12 py-3 bg-input border-border text-foreground placeholder:text-muted-foreground"
                  data-testid="input-invoice-id"
                />
                <Receipt className="absolute right-3 top-3.5 h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                Invoice ID from your Ryft Stock purchase confirmation email
              </p>
              {form.formState.errors.invoiceId && (
                <p className="text-sm text-destructive" data-testid="error-invoice-id">
                  {form.formState.errors.invoiceId.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-card-foreground">
                Email Address *
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  {...form.register("email")}
                  placeholder="your.email@example.com"
                  className="pl-4 pr-12 py-3 bg-input border-border text-foreground placeholder:text-muted-foreground"
                  data-testid="input-email"
                />
                <Mail className="absolute right-3 top-3.5 h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                Email used for your Ryft Stock purchase
              </p>
              {form.formState.errors.email && (
                <p className="text-sm text-destructive" data-testid="error-email">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
          </div>


          <div className="pt-4">
            <Button
              type="submit"
              disabled={verifyMutation.isPending}
              className="w-full bg-primary hover:bg-secondary text-primary-foreground font-semibold py-4 px-6 glow-effect hover:scale-[1.02] transition-all duration-200"
              data-testid="button-verify"
            >
              {verifyMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Verify & Continue
                </>
              )}
            </Button>
          </div>
        </form>

        {error && (
          <Alert className="mt-6 border-destructive/20 bg-destructive/10" data-testid="alert-error">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">
              <strong>Verification Failed</strong>
              <p className="text-sm mt-1" data-testid="text-error-message">{error}</p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}