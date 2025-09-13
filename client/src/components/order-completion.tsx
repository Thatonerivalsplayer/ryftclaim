import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle, MessageCircle, RotateCcw, Home, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ClaimWithItems } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface OrderCompletionProps {
  claimData: ClaimWithItems;
  robloxUsername: string;
  onStartOver: () => void;
}

export function OrderCompletion({ claimData, robloxUsername, onStartOver }: OrderCompletionProps) {
  // Remove automatic completion - just show the claim ID

  // Removed handleBackToStore function

  const handleJoinDiscord = () => {
    window.open("https://discord.gg/ryftstock", "_blank");
  };

  return (
    <Card className="shadow-2xl border-border success-bounce" data-testid="card-order-completion">
      <CardContent className="p-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-3xl text-green-500" />
          </div>
          
          <h2 className="text-3xl font-bold text-card-foreground mb-4" data-testid="text-completion-title">
            🎉 Ready for Delivery!
          </h2>
          
          <div className="space-y-6">
            <div className="space-y-4">
              <p className="text-muted-foreground text-lg" data-testid="text-completion-success">
                Your order is verified and ready! Use the Discord bot to claim your items.
              </p>
              
              <div className="bg-[#5865F2]/10 rounded-lg p-6 border border-[#5865F2]/20">
                <h3 className="text-xl font-bold text-card-foreground mb-4 text-center">
                  Your Claim ID
                </h3>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border border-[#5865F2]/30 mb-4">
                  <code className="text-2xl font-mono font-bold text-[#5865F2] dark:text-[#7289da] block text-center select-all">
                    {claimData.claimId || 'RFT-XXXX-XXXX'}
                  </code>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Click to copy • Use this ID in Discord
                </p>
              </div>

              <div className="bg-green-500/10 rounded-lg p-6 border border-green-500/20">
                <h3 className="text-lg font-semibold text-card-foreground mb-3">
                  📋 How to claim your items:
                </h3>
                <div className="space-y-3 text-sm text-left">
                  <div className="flex items-start space-x-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-[#5865F2] text-white rounded-full text-xs font-bold mt-0.5">1</span>
                    <span>Join discord.gg/ryftstock</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-[#5865F2] text-white rounded-full text-xs font-bold mt-0.5">2</span>
                    <span>Go to any channel and type: <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded font-mono text-xs text-[#5865F2] dark:text-[#7289da] font-semibold">/claim {claimData.claimId || 'RFT-XXXX-XXXX'}</code></span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-green-500 text-white rounded-full text-xs font-bold mt-0.5">✓</span>
                    <span>The bot will create your private delivery channel and contact you!</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-600/10 rounded-lg p-6 border border-blue-600/20">
                <h3 className="text-lg font-semibold text-card-foreground mb-3">
                  📦 Order Details:
                </h3>
                <div className="space-y-2 text-sm">
                  <p><strong>Roblox Username:</strong> {robloxUsername}</p>
                  <p><strong>Items:</strong> {claimData.items.length} garden item(s)</p>
                  <p><strong>Status:</strong> <span className="text-blue-500 font-semibold">Ready for Claim</span></p>
                </div>
              </div>

              <div className="bg-blue-600/10 rounded-lg p-6 border border-blue-600/20">
                <h3 className="text-lg font-semibold text-card-foreground mb-3 flex items-center">
                  <MessageCircle className="mr-2 text-blue-600" />
                  Need Help?
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  If you experience any issues with your items or need support, please contact us through Discord. 
                  Our team is available 24/7 to help you.
                </p>
                <Button
                  onClick={handleJoinDiscord}
                  className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white border-[#5865F2] hover:border-[#4752C4]"
                  data-testid="button-join-discord"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Join discord.gg/ryftstock
                </Button>
              </div>
            </div>
            
            <div className="flex justify-center pt-4">
              <Button
                onClick={onStartOver}
                className="inline-flex items-center bg-primary hover:bg-secondary text-primary-foreground font-semibold py-3 px-6 transition-all duration-200"
                data-testid="button-claim-another"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Claim Another Order
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}