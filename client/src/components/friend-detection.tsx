import { useState } from "react";
import { Check, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ClaimWithItems } from "@shared/schema";

interface FriendDetectionProps {
  claimData: ClaimWithItems;
  robloxUsername: string;
  onFriendConfirmed: () => void;
}

export function FriendDetection({ claimData, robloxUsername, onFriendConfirmed }: FriendDetectionProps) {
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = () => {
    setConfirmed(true);
    onFriendConfirmed();
  };

  return (
    <Card className="shadow-2xl border-border fade-in" data-testid="card-account-confirmation">
      <CardContent className="p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="text-2xl text-green-500" />
          </div>
          <h2 className="text-3xl font-bold text-card-foreground mb-3" data-testid="text-confirm-title">
            Confirm Delivery Account
          </h2>
          <p className="text-muted-foreground text-lg" data-testid="text-confirm-description">
            Your items will be delivered to this Roblox account
          </p>
        </div>

        <div className="space-y-6">
          {/* Account Display */}
          <div className="bg-green-500/10 rounded-lg p-6 border border-green-500/20 text-center">
            <h3 className="text-lg font-semibold text-card-foreground mb-4">
              Delivery Account:
            </h3>
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                <User className="text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold text-card-foreground">@{robloxUsername}</p>
                <p className="text-sm text-muted-foreground">Roblox Username</p>
              </div>
            </div>
            
            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Order ID:</span>
                <span className="font-mono text-card-foreground">{claimData.invoiceId}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Items:</span>
                <span className="text-card-foreground">{claimData.items.length} garden item(s)</span>
              </div>
            </div>
          </div>

          {/* Confirmation Question */}
          <div className="bg-blue-600/10 rounded-lg p-6 border border-blue-600/20 text-center">
            <h3 className="text-lg font-semibold text-card-foreground mb-2">
              Is this your Roblox account?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Items will be delivered directly to <strong>@{robloxUsername}</strong>
            </p>
          </div>

          {/* Action Button */}
          <Button
            onClick={handleConfirm}
            disabled={confirmed}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-4 text-lg glow-effect hover:scale-[1.02] transition-all duration-200"
            data-testid="button-confirm-account"
          >
            {confirmed ? (
              <>
                <Check className="mr-2 h-5 w-5" />
                Account Confirmed
              </>
            ) : (
              <>
                <Check className="mr-2 h-5 w-5" />
                Continue
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            By confirming, you agree that items will be delivered to @{robloxUsername}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}