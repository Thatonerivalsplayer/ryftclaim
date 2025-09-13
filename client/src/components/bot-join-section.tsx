import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { SiRoblox } from "react-icons/si";
import { Bot, ExternalLink, MessageCircle, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ClaimWithItems, BotJoin } from "@shared/schema";
import { botJoinSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface BotJoinSectionProps {
  claimData: ClaimWithItems;
  onComplete: () => void;
}

export function BotJoinSection({ claimData, onComplete }: BotJoinSectionProps) {
  const [joinError, setJoinError] = useState<string | null>(null);

  const form = useForm<BotJoin>({
    resolver: zodResolver(botJoinSchema),
    defaultValues: {
      invoiceId: claimData.invoiceId,
      robloxUsername: "",
    },
  });

  const botJoinMutation = useMutation({
    mutationFn: async (data: BotJoin) => {
      const response = await apiRequest("POST", "/api/bot/join", data);
      return response.json();
    },
    onSuccess: (result) => {
      setJoinError(null);
      if (result.botJoinUrl) {
        // Open Roblox game in new tab
        window.open(result.botJoinUrl, "_blank");
      }
      // Simulate successful delivery after a short delay
      setTimeout(() => {
        onComplete();
      }, 3000);
    },
    onError: (error: any) => {
      const message = error.message || "Failed to join bot. Please try again.";
      setJoinError(message);
    },
  });

  const onSubmit = (data: BotJoin) => {
    setJoinError(null);
    botJoinMutation.mutate(data);
  };

  const handleDiscordSupport = () => {
    window.open("https://discord.gg/gardenshop", "_blank");
  };

  return (
    <Card className="shadow-2xl border-border fade-in" data-testid="card-bot-join">
      <CardContent className="p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <SiRoblox className="text-2xl text-primary" />
          </div>
          <h2 className="text-3xl font-bold text-card-foreground mb-3" data-testid="text-bot-join-title">
            Join Bot to Receive Items
          </h2>
          <p className="text-muted-foreground text-lg" data-testid="text-bot-join-description">
            Click the button below to join our delivery bot and receive your garden items in Roblox
          </p>
        </div>

        <div className="space-y-6">
          {/* Instructions */}
          <div className="bg-muted/30 rounded-lg p-6 border border-border/50" data-testid="container-instructions">
            <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center">
              <Bot className="mr-2 text-primary" />
              How it works:
            </h3>
            <div className="space-y-3 text-muted-foreground">
              <div className="flex items-start space-x-3">
                <span className="inline-flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-xs font-bold mt-0.5">
                  1
                </span>
                <p data-testid="text-instruction-1">Click "Join Bot Game" to enter the delivery server</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="inline-flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-xs font-bold mt-0.5">
                  2
                </span>
                <p data-testid="text-instruction-2">Make sure your pet inventory isn't full (sell some pets if needed)</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="inline-flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-xs font-bold mt-0.5">
                  3
                </span>
                <p data-testid="text-instruction-3">The bot will automatically send you trade requests for your items</p>
              </div>
              <div className="flex items-start space-x-3">
                <span className="inline-flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-xs font-bold mt-0.5">
                  4
                </span>
                <p data-testid="text-instruction-4">If you have multiple items, rejoin the server to receive them one by one</p>
              </div>
            </div>
          </div>

          {/* Roblox Username Form */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="robloxUsername" className="text-sm font-medium text-card-foreground">
                Enter Your Roblox Username *
              </Label>
              <div className="relative">
                <Input
                  id="robloxUsername"
                  {...form.register("robloxUsername")}
                  placeholder="YourRobloxUsername"
                  className="pl-4 pr-12 py-3 bg-input border-border text-foreground placeholder:text-muted-foreground"
                  data-testid="input-roblox-username"
                />
                <User className="absolute right-3 top-3.5 h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter your exact Roblox username (case sensitive) so the bot can find you
              </p>
              {form.formState.errors.robloxUsername && (
                <p className="text-sm text-destructive" data-testid="error-roblox-username">
                  {form.formState.errors.robloxUsername.message}
                </p>
              )}
            </div>

            {/* Bot Join Button */}
            <div className="text-center">
              <Button
                type="submit"
                disabled={botJoinMutation.isPending}
                className="inline-flex items-center bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-8 text-lg glow-effect hover:scale-[1.02] transition-all duration-200"
                data-testid="button-join-bot"
              >
                {botJoinMutation.isPending ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <SiRoblox className="mr-3 text-xl" />
                    Join Bot Game
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground mt-3" data-testid="text-roblox-note">
                This will open Roblox and the bot will contact you in-game
              </p>
            </div>
          </form>

          {/* Error Message */}
          {joinError && (
            <Alert className="border-destructive/20 bg-destructive/10" data-testid="alert-join-error">
              <AlertDescription className="text-destructive">
                <p data-testid="text-join-error">{joinError}</p>
              </AlertDescription>
            </Alert>
          )}

          {/* Discord Support */}
          <div className="border-t border-border pt-6">
            <div className="text-center">
              <h4 className="text-lg font-semibold text-card-foreground mb-3" data-testid="text-help-title">
                Need Help?
              </h4>
              <p className="text-muted-foreground mb-4" data-testid="text-help-description">
                If you're having trouble receiving your items, join our Discord server for 24/7 support
              </p>
              <Button
                onClick={handleDiscordSupport}
                variant="outline"
                className="inline-flex items-center bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 hover:border-indigo-700 font-semibold py-3 px-6 transition-all duration-200"
                data-testid="button-discord-support"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Join Discord Support
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
