import { CheckCircle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface SuccessMessageProps {
  onStartOver: () => void;
}

export function SuccessMessage({ onStartOver }: SuccessMessageProps) {
  const handleBackToStore = () => {
    // TODO: Navigate to actual store URL
    window.location.href = "https://ryftstock.com/store";
  };

  return (
    <Card className="shadow-2xl border-border success-bounce" data-testid="card-success">
      <CardContent className="p-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-3xl text-primary" />
          </div>
          <h2 className="text-3xl font-bold text-card-foreground mb-4" data-testid="text-success-title">
            Items Successfully Claimed!
          </h2>
          <p className="text-muted-foreground text-lg mb-6" data-testid="text-success-description">
            Your garden items have been delivered to your Roblox account. Enjoy your new pets and plants!
          </p>
          
          <div className="flex justify-center space-x-4">
            <Button
              onClick={onStartOver}
              className="inline-flex items-center bg-primary hover:bg-secondary text-primary-foreground font-semibold py-3 px-6 transition-all duration-200"
              data-testid="button-claim-another"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Claim Another Order
            </Button>
            <Button
              onClick={handleBackToStore}
              variant="outline"
              className="inline-flex items-center bg-muted hover:bg-muted/80 text-muted-foreground font-semibold py-3 px-6 transition-all duration-200"
              data-testid="button-back-store"
            >
              <Home className="mr-2 h-4 w-4" />
              Back to Store
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
