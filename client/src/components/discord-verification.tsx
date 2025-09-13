import { useState, ReactElement } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { User, UserPlus, Loader2, AlertTriangle, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ClaimWithItems } from "@shared/schema";
import { z } from "zod";

interface DiscordVerificationProps {
  claimData: ClaimWithItems;
  robloxUsername: string;
  onDiscordVerified: (discordUsername: string, discordUserId: string) => void;
}

interface DiscordUser {
  success: boolean;
  id?: string;
  username?: string;
  discriminator?: string;
  globalName?: string;
  avatar?: string;
  avatarUrl?: string;
  message?: string;
}

const discordUsernameSchema = z.object({
  discordUsername: z.string().min(2, "Discord username must be at least 2 characters").max(32, "Discord username cannot exceed 32 characters"),
});

type DiscordUsernameForm = z.infer<typeof discordUsernameSchema>;

export function DiscordVerification({ claimData, robloxUsername, onDiscordVerified }: DiscordVerificationProps) {
  const [error, setError] = useState<string | ReactElement | null>(null);
  const [discordUsername, setDiscordUsername] = useState<string>("");
  const [userConfirmed, setUserConfirmed] = useState(false);
  const [discordUser, setDiscordUser] = useState<DiscordUser | null>(null);

  const form = useForm<DiscordUsernameForm>({
    resolver: zodResolver(discordUsernameSchema),
    defaultValues: {
      discordUsername: "",
    },
  });

  // Fetch Discord user data from backend
  const { refetch: fetchDiscordUser } = useQuery({
    queryKey: ['discord-user', discordUsername],
    queryFn: async () => {
      if (!discordUsername) return null;
      
      const response = await fetch(`/api/discord/user/${discordUsername}`);
      return response.json();
    },
    enabled: false
  });

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const username = e.target.value;
    setDiscordUsername(username);
    form.setValue("discordUsername", username);
    setDiscordUser(null);
    setUserConfirmed(false);
  };

  const handleCheckUser = async () => {
    if (discordUsername.length >= 2) {
      setError(null);
      const result = await fetchDiscordUser();
      
      if (result.data?.success) {
        setDiscordUser(result.data);
        setError(null);
      } else {
        setDiscordUser(null);
        // Check if the error message indicates user exists but not in server
        const errorMessage = result.data?.message || '';
        if (errorMessage.includes('not found in the server')) {
          setError(
            <>
              Account found but not found in server. <br />
              Join <a href="https://discord.gg/aR8wsRYrHK" target="_blank" rel="noopener noreferrer" className="text-[#5865F2] hover:underline font-medium">https://discord.gg/aR8wsRYrHK</a> and try again.
            </>
          );
        } else {
          setError(`The Discord username "${discordUsername}" was not found. Please check the spelling and try again.`);
        }
      }
    }
  };

  const handleConfirmUser = () => {
    setUserConfirmed(true);
  };

  const handleGoBack = () => {
    setUserConfirmed(false);
    setDiscordUser(null);
  };

  const onSubmit = (data: DiscordUsernameForm) => {
    setError(null);
    if (discordUser?.id) {
      onDiscordVerified(discordUsername, discordUser.id);
    } else {
      setError("Discord user ID not found. Please try again.");
    }
  };

  return (
    <Card className="shadow-2xl border-border fade-in" data-testid="card-discord-verification">
      <CardContent className="p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#5865F2]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="text-2xl text-[#5865F2]" />
          </div>
          <h2 className="text-3xl font-bold text-card-foreground mb-3" data-testid="text-discord-title">
            {!discordUser ? "Enter Your Discord Username" : 
             !userConfirmed ? "Is This Your Discord Account?" : "Verifying Your Discord Account"}
          </h2>
          <p className="text-muted-foreground text-lg" data-testid="text-discord-description">
            {!discordUser ? "Enter your exact Discord username to verify your account" : 
             !userConfirmed ? "Please confirm this is your Discord account" : "Confirming your Discord identity"}
          </p>
        </div>

        {!discordUser ? (
          /* Discord Username Input Form */
          <div className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-24 h-24 rounded-full border-4 border-muted bg-muted/30 flex items-center justify-center">
                <User className="w-8 h-8 text-[#5865F2]" />
              </div>

              <div className="w-full max-w-md space-y-2">
                <Label htmlFor="discordUsername" className="text-sm font-medium text-card-foreground">
                  Discord Username *
                </Label>
                <div className="relative">
                  <Input
                    id="discordUsername"
                    value={discordUsername}
                    onChange={handleUsernameChange}
                    placeholder="YourDiscordUsername"
                    className="pl-4 pr-12 py-3 bg-input border-border text-foreground placeholder:text-muted-foreground text-center"
                    data-testid="input-discord-username"
                  />
                  <User className="absolute right-3 top-3.5 h-4 w-4 text-[#5865F2]" />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Enter your Discord username (without @)
                </p>
              </div>
            </div>

            <div className="text-center">
              <Button
                onClick={handleCheckUser}
                disabled={discordUsername.length < 2}
                className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold py-4 px-8 glow-effect hover:scale-[1.02] transition-all duration-200"
                data-testid="button-check-discord-user"
              >
                <User className="mr-2 h-4 w-4" />
                Check Discord Username
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                Make sure the username is spelled exactly as it appears on Discord
              </p>
            </div>
          </div>
        ) : !userConfirmed ? (
          /* Discord User Confirmation */
          <div className="space-y-8">
            {/* Profile Display */}
            <div className="flex flex-col items-center space-y-6">
              <div className="relative">
                <img
                  src={discordUser.avatarUrl || "https://cdn.discordapp.com/embed/avatars/0.png"}
                  alt={`${discordUser.username}'s Discord avatar`}
                  className="w-36 h-36 rounded-full border-4 border-[#5865F2] shadow-2xl glow-effect"
                  data-testid="img-discord-avatar"
                  onError={(e) => {
                    e.currentTarget.src = "https://cdn.discordapp.com/embed/avatars/0.png";
                  }}
                />
                <div className="absolute -bottom-3 -right-3 w-10 h-10 bg-[#5865F2] rounded-full border-4 border-background flex items-center justify-center shadow-lg">
                  <Check className="w-5 h-5 text-white" />
                </div>
              </div>
              
              {/* User Info Card */}
              <div className="bg-muted/20 rounded-lg p-6 border border-border text-center max-w-md w-full">
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-card-foreground">
                    {discordUser.globalName || discordUser.username}
                  </h3>
                  <div className="inline-flex items-center px-3 py-1 bg-[#5865F2]/10 rounded-full">
                    <User className="w-4 h-4 mr-2 text-[#5865F2]" />
                    <span className="text-[#5865F2] font-medium">
                      @{discordUser.username}
                      {discordUser.discriminator && discordUser.discriminator !== "0" ? `#${discordUser.discriminator}` : ""}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Confirmation Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                onClick={handleGoBack}
                variant="outline"
                className="w-full sm:w-auto min-w-32 py-3 px-6 border-border hover:bg-muted"
                data-testid="button-go-back"
              >
                No, Go Back
              </Button>
              <Button
                onClick={handleConfirmUser}
                className="w-full sm:w-auto min-w-32 py-3 px-6 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold glow-effect hover:scale-[1.02] transition-all duration-200"
                data-testid="button-confirm-discord-user"
              >
                Yes, That's Me
              </Button>
            </div>
          </div>
        ) : (
          /* Final Confirmation */
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="flex flex-col items-center space-y-6">
              <div className="relative">
                <img
                  src={discordUser.avatarUrl || "https://cdn.discordapp.com/embed/avatars/0.png"}
                  alt={`${discordUser.username}'s Discord avatar`}
                  className="w-28 h-28 rounded-full border-4 border-[#5865F2] shadow-xl"
                  data-testid="img-discord-avatar-final"
                />
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-3 border-background flex items-center justify-center shadow-md">
                  <Check className="w-4 h-4 text-white" />
                </div>
              </div>
              
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-card-foreground">
                  Discord Account Verified!
                </h3>
                <p className="text-muted-foreground">
                  @{discordUser.username} • Ready to proceed
                </p>
              </div>
            </div>

            <div className="text-center">
              <Button
                type="submit"
                className="bg-primary hover:bg-secondary text-primary-foreground font-semibold py-4 px-8 glow-effect hover:scale-[1.02] transition-all duration-200"
                data-testid="button-continue-to-ticket"
              >
                Continue to Order
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </form>
        )}

        {error && (
          <Alert className="mt-6 border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}