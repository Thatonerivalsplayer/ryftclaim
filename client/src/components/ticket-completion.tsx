import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle, ExternalLink, RotateCcw, Ticket, Users, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ClaimWithItems } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface TicketCompletionProps {
  claimData: ClaimWithItems;
  robloxUsername: string;
  discordUsername: string;
  discordUserId: string;
  onClaimAnother: () => void;
}

export function TicketCompletion({ claimData, robloxUsername, discordUsername, discordUserId, onClaimAnother }: TicketCompletionProps) {
  const [ticketResult, setTicketResult] = useState<{
    success: boolean;
    channelName?: string;
    inviteUrl?: string;
    message?: string;
    userAdded?: boolean;
  } | null>(null);

  const createTicketMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/discord/create-ticket", {
        invoiceId: claimData.invoiceId,
        email: claimData.email,
        robloxUsername: robloxUsername,
        discordUsername: discordUsername,
        discordUserId: discordUserId,
        items: claimData.items
      });
      return response.json();
    },
    onSuccess: (result) => {
      setTicketResult(result);
    },
  });

  const handleCreateTicket = () => {
    createTicketMutation.mutate();
  };

  const totalPrice = claimData.items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);

  if (!ticketResult) {
    return (
      <Card className="shadow-2xl border-border fade-in" data-testid="card-ticket-creation">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Ticket className="text-2xl text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-card-foreground mb-3" data-testid="text-ticket-title">
              Ready to Create Your Order Ticket
            </h2>
            <p className="text-muted-foreground text-lg" data-testid="text-ticket-description">
              We'll create a private Discord channel for your garden item delivery
            </p>
          </div>

          {/* Order Summary */}
          <div className="bg-muted/20 rounded-lg p-6 border border-border mb-8">
            <div className="space-y-4">
              <div className="flex justify-between pb-3 border-b border-border">
                <h3 className="font-semibold text-card-foreground flex items-center">
                  <Gift className="w-4 h-4 mr-2" />
                  Order Summary
                </h3>
                <span className="text-primary font-bold">${totalPrice.toFixed(2)}</span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice ID:</span>
                  <span className="text-card-foreground font-mono">{claimData.invoiceId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="text-card-foreground">{claimData.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discord Username:</span>
                  <span className="text-card-foreground">@{discordUsername}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Roblox Username:</span>
                  <span className="text-card-foreground">@{robloxUsername}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items:</span>
                  <span className="text-card-foreground">{claimData.items.length} garden item(s)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="text-center">
            <Button
              onClick={handleCreateTicket}
              disabled={createTicketMutation.isPending}
              className="bg-primary hover:bg-secondary text-primary-foreground font-semibold py-4 px-8 glow-effect hover:scale-[1.02] transition-all duration-200"
              data-testid="button-create-ticket"
            >
              {createTicketMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Ticket...
                </>
              ) : (
                <>
                  <Ticket className="mr-2 h-4 w-4" />
                  Create Discord Ticket
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              This will create a private Discord channel for your order
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Ticket created successfully
  return (
    <Card className="shadow-2xl border-border fade-in" data-testid="card-ticket-success">
      <CardContent className="p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-2xl text-green-500" />
          </div>
          <h2 className="text-3xl font-bold text-card-foreground mb-3" data-testid="text-success-title">
            Order Ticket Created!
          </h2>
          <p className="text-muted-foreground text-lg" data-testid="text-success-description">
            Your private Discord channel is ready for item delivery
          </p>
        </div>

        {ticketResult.success && (
          <div className="space-y-6">
            {/* Success Alert */}
            <Alert className="border-green-500/50 text-green-700 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Ticket #{ticketResult.channelName}</strong> has been created successfully!
                Go to your Discord server to continue your order.
                {ticketResult.userAdded !== undefined && (
                  <div className="mt-2 text-sm">
                    <span className={ticketResult.userAdded ? "text-green-600 font-semibold" : "text-orange-600 font-semibold"}>
                      {ticketResult.userAdded 
                        ? "✓ You have been automatically added to the Discord channel" 
                        : "⚠ You may need to manually request access to the Discord channel"
                      }
                    </span>
                  </div>
                )}
              </AlertDescription>
            </Alert>

            {/* Instructions */}
            <div className="bg-muted/20 rounded-lg p-6 border border-border">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">1</div>
                  <div>
                    <p className="font-medium text-card-foreground">Join the Discord Server</p>
                    <p className="text-sm text-muted-foreground">Click the button below to join our Discord server</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">2</div>
                  <div>
                    <p className="font-medium text-card-foreground">Find Your Ticket</p>
                    <p className="text-sm text-muted-foreground">Look for the channel <span className="font-mono bg-muted px-1 rounded">#{ticketResult.channelName}</span> in the Discord server</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">3</div>
                  <div>
                    <p className="font-medium text-card-foreground">Receive Your Items</p>
                    <p className="text-sm text-muted-foreground">Our bot will deliver your {claimData.items.length} garden item(s) to your Roblox account</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={() => window.open(ticketResult.inviteUrl || "https://discord.gg/ryftstock", '_blank')}
                className="flex-1 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold py-4 px-6"
                data-testid="button-join-discord"
              >
                <Users className="mr-2 h-4 w-4" />
                Go to Discord Ticket
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
              <Button
                onClick={onClaimAnother}
                variant="outline"
                className="flex-1 py-4 px-6 border-border hover:bg-muted"
                data-testid="button-claim-another"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Claim Another Order
              </Button>
            </div>
          </div>
        )}

        {!ticketResult.success && (
          <Alert className="border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive">
            <AlertDescription>
              {ticketResult.message || "Failed to create Discord ticket. Please try again or contact support."}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}