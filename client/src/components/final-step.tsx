import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle, MessageCircle, RotateCcw, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ClaimWithItems } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface FinalStepProps {
  claimData: ClaimWithItems;
  robloxUser: any;
  discordUserId?: string;
  onStartOver: () => void;
}

export function FinalStep({ claimData, robloxUser, discordUserId, onStartOver }: FinalStepProps) {
  const [isProcessing, setIsProcessing] = useState(true);
  const [ticketCreated, setTicketCreated] = useState(false);
  const [userAdded, setUserAdded] = useState<boolean | null>(null);

  const createTicketMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/discord/create-ticket", {
        invoiceId: claimData.invoiceId,
        email: claimData.email,
        robloxUsername: robloxUser.username,
        robloxUserId: robloxUser.userId,
        discordUserId: discordUserId,
        items: claimData.items
      });
      return response.json();
    },
    onSuccess: (result) => {
      setTicketCreated(result.success);
      setUserAdded(result.userAdded);
      setIsProcessing(false);
    },
    onError: (error) => {
      console.error("Ticket creation error:", error);
      setTicketCreated(false);
      setUserAdded(false);
      setIsProcessing(false);
    },
  });

  useEffect(() => {
    // Automatically create Discord ticket after 2 seconds
    const timer = setTimeout(() => {
      createTicketMutation.mutate();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleDiscordSupport = () => {
    window.open("https://discord.gg/aR8wsRYrHK", "_blank");
  };

  return (
    <Card className="shadow-2xl border-border success-bounce" data-testid="card-final-step">
      <CardContent className="p-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            {isProcessing ? (
              <Loader2 className="text-3xl text-green-500 animate-spin" />
            ) : (
              <CheckCircle className="text-3xl text-green-500" />
            )}
          </div>
          
          <h1 className="text-3xl font-bold text-card-foreground mb-4" data-testid="text-final-title">
            {isProcessing ? "Processing Your Claim..." : "Final Step: Collect Your Items!"}
          </h1>
          
          {isProcessing ? (
            <div className="space-y-4">
              <p className="text-muted-foreground text-lg" data-testid="text-processing">
                Setting up your delivery and creating a support ticket...
              </p>
              <div className="flex justify-center">
                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="w-full h-full bg-primary animate-pulse rounded-full"></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-muted-foreground text-lg" data-testid="text-final-description">
                Follow the steps below to receive your items. Some items may require action.
              </p>
              
              <div className="bg-green-500/10 rounded-lg p-6 border border-green-500/20">
                <h3 className="text-lg font-semibold text-card-foreground mb-4">
                  ✅ Your claim has been processed successfully!
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Order ID:</span>
                    <span className="font-mono text-card-foreground">{claimData.invoiceId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Roblox Account:</span>
                    <div className="flex items-center space-x-2">
                      <img
                        src={robloxUser.avatarUrl}
                        alt={`${robloxUser.username}'s avatar`}
                        className="w-5 h-5 rounded-full border"
                      />
                      <span className="text-card-foreground">@{robloxUser.username}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Items:</span>
                    <span className="text-card-foreground">{claimData.items.length} garden item(s)</span>
                  </div>
                  {ticketCreated && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Support Ticket:</span>
                      <span className="text-green-600 font-semibold">✓ Created</span>
                    </div>
                  )}
                  {userAdded !== null && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Discord Access:</span>
                      <span className={userAdded ? "text-green-600 font-semibold" : "text-orange-600 font-semibold"}>
                        {userAdded ? "✓ Added to Channel" : "⚠ Manual Access Required"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-600/10 rounded-lg p-6 border border-blue-600/20">
                <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center">
                  <MessageCircle className="mr-2 text-blue-600" />
                  Next Steps
                </h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>1. A delivery ticket has been automatically created in our Discord server</p>
                  <p>2. Our staff will contact you within 24 hours to arrange delivery</p>
                  <p>3. Make sure you can receive friend requests on Roblox</p>
                  <p>4. Keep your Discord notifications enabled for faster communication</p>
                </div>
              </div>
              
              <div className="flex justify-center space-x-4 pt-4">
                <Button
                  onClick={handleDiscordSupport}
                  className="inline-flex items-center bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold py-3 px-6 transition-all duration-200"
                  data-testid="button-join-discord"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Join Discord Server
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  onClick={onStartOver}
                  variant="outline"
                  className="inline-flex items-center bg-muted hover:bg-muted/80 text-muted-foreground font-semibold py-3 px-6 transition-all duration-200"
                  data-testid="button-new-claim"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  New Claim
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}