import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { User, UserPlus, Loader2, AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ClaimWithItems, BotJoin } from "@shared/schema";
import { botJoinSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface UsernameCollectionProps {
  claimData: ClaimWithItems;
  onFriendAdded: (robloxUsername: string) => void;
}

interface RobloxUser {
  success: boolean;
  userId?: number;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  message?: string;
}

export function UsernameCollection({ claimData, onFriendAdded }: UsernameCollectionProps) {
  const [error, setError] = useState<string | null>(null);
  const [robloxUsername, setRobloxUsername] = useState<string>("");
  const [userConfirmed, setUserConfirmed] = useState(false);
  const [robloxUser, setRobloxUser] = useState<RobloxUser | null>(null);

  const form = useForm<BotJoin>({
    resolver: zodResolver(botJoinSchema),
    defaultValues: {
      invoiceId: claimData.invoiceId,
      robloxUsername: "",
      discordUsername: "", // Still needed for form validation but not used in this component
    },
  });

  // Fetch Roblox user data from backend
  const { refetch: fetchUser } = useQuery({
    queryKey: ['roblox-user', robloxUsername],
    queryFn: async () => {
      if (!robloxUsername) return null;
      
      const response = await fetch(`/api/roblox/avatar/${robloxUsername}`);
      return response.json();
    },
    enabled: false
  });

  const confirmUserMutation = useMutation({
    mutationFn: async (data: BotJoin) => {
      const response = await apiRequest("POST", "/api/bot/add-friend", data);
      return response.json();
    },
    onSuccess: (result) => {
      setError(null);
      if (result.success) {
        onFriendAdded(robloxUsername);
      }
    },
    onError: (error: any) => {
      const message = error.message || "Failed to add friend. Please try again.";
      setError(message);
    },
  });

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const username = e.target.value;
    setRobloxUsername(username);
    form.setValue("robloxUsername", username);
    setRobloxUser(null);
    setUserConfirmed(false);
  };


  const handleCheckUser = async () => {
    if (robloxUsername.length >= 3) {
      setError(null);
      const result = await fetchUser();
      
      if (result.data?.success) {
        setRobloxUser(result.data);
        setError(null);
      } else {
        setRobloxUser(null);
        setError(`The username "${robloxUsername}" was not found on Roblox. Please check the spelling and try again.`);
      }
    }
  };

  const handleConfirmUser = () => {
    setUserConfirmed(true);
    // Ensure form has the robloxUsername when user confirms
    if (robloxUser?.username) {
      form.setValue("robloxUsername", robloxUser.username);
    }
  };

  const handleGoBack = () => {
    setUserConfirmed(false);
    setRobloxUser(null);
  };

  const onSubmit = (data: BotJoin) => {
    setError(null);
    confirmUserMutation.mutate(data);
  };

  return (
    <Card className="shadow-2xl border-border fade-in" data-testid="card-username-collection">
      <CardContent className="p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="text-2xl text-primary" />
          </div>
          <h2 className="text-3xl font-bold text-card-foreground mb-3" data-testid="text-username-title">
            {!robloxUser ? "Enter Your Roblox Username" : 
             !userConfirmed ? "Is This Your Account?" : "Confirming Your Account"}
          </h2>
          <p className="text-muted-foreground text-lg" data-testid="text-username-description">
            {!robloxUser ? "Enter your exact Roblox username to verify your account" : 
             !userConfirmed ? "Please confirm this is your Roblox account" : "Adding you as a friend for item delivery"}
          </p>
        </div>

        {!robloxUser ? (
          /* Username Input Form */
          <div className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-24 h-24 rounded-full border-4 border-muted bg-muted/30 flex items-center justify-center">
                <User className="w-8 h-8 text-muted-foreground" />
              </div>

              <div className="w-full max-w-md space-y-2">
                <Label htmlFor="robloxUsername" className="text-sm font-medium text-card-foreground">
                  Roblox Username *
                </Label>
                <div className="relative">
                  <Input
                    id="robloxUsername"
                    value={robloxUsername}
                    onChange={handleUsernameChange}
                    placeholder="YourRobloxUsername"
                    className="pl-4 pr-12 py-3 bg-input border-border text-foreground placeholder:text-muted-foreground text-center"
                    data-testid="input-roblox-username"
                  />
                  <User className="absolute right-3 top-3.5 h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Enter your exact Roblox username (case sensitive)
                </p>
              </div>
            </div>

            <div className="text-center">
              <Button
                onClick={handleCheckUser}
                disabled={robloxUsername.length < 3}
                className="bg-primary hover:bg-secondary text-primary-foreground font-semibold py-4 px-8 glow-effect hover:scale-[1.02] transition-all duration-200"
                data-testid="button-check-user"
              >
                <User className="mr-2 h-4 w-4" />
                Check Username
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                Make sure the username is spelled exactly as it appears in Roblox
              </p>
            </div>
          </div>
        ) : !userConfirmed ? (
          /* User Confirmation - Improved */
          <div className="space-y-8">
            {/* Profile Display */}
            <div className="flex flex-col items-center space-y-6">
              <div className="relative">
                <img
                  src={robloxUser.avatarUrl}
                  alt={`${robloxUser.username}'s avatar`}
                  className="w-36 h-36 rounded-full border-4 border-primary shadow-2xl glow-effect"
                  data-testid="img-roblox-avatar"
                  onError={(e) => {
                    e.currentTarget.src = "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150";
                  }}
                />
                <div className="absolute -bottom-3 -right-3 w-10 h-10 bg-green-500 rounded-full border-4 border-background flex items-center justify-center shadow-lg">
                  <Check className="w-5 h-5 text-white" />
                </div>
              </div>
              
              {/* User Info Card */}
              <div className="bg-muted/20 rounded-lg p-6 border border-border text-center max-w-md w-full">
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-card-foreground">
                    {robloxUser.displayName || robloxUser.username}
                  </h3>
                  <div className="inline-flex items-center px-3 py-1 bg-primary/10 rounded-full">
                    <User className="w-4 h-4 mr-2 text-primary" />
                    <span className="text-primary font-medium">@{robloxUser.username}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Roblox User ID: {robloxUser.userId}
                  </p>
                </div>
              </div>
            </div>

            {/* Confirmation Section */}
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <h4 className="text-xl font-semibold text-card-foreground">
                  Account Verification
                </h4>
                <p className="text-muted-foreground text-lg">
                  Please confirm this is your Roblox account to continue with delivery
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <Button
                  onClick={handleGoBack}
                  variant="outline"
                  className="w-full sm:w-auto bg-muted hover:bg-muted/80 text-muted-foreground border-border hover:border-muted-foreground/50 px-8 py-3"
                  data-testid="button-go-back"
                >
                  <User className="mr-2 h-4 w-4" />
                  Wrong Account
                </Button>
                <Button
                  onClick={handleConfirmUser}
                  disabled={userConfirmed}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-semibold py-3 px-8 glow-effect hover:scale-[1.02] transition-all duration-200"
                  data-testid="button-confirm-user"
                >
                  {userConfirmed ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-5 w-5" />
                      Confirm & Continue
                    </>
                  )}
                </Button>
              </div>

              {/* Security Notice */}
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center max-w-md mx-auto">
                <p className="text-sm text-primary font-medium">
                  🔐 Your account will be used for secure item delivery only
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Processing Friend Request */
          <div className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <img
                src={robloxUser?.avatarUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150"}
                alt={`${robloxUser?.username}'s avatar`}
                className="w-24 h-24 rounded-full border-4 border-primary shadow-lg"
                data-testid="img-roblox-avatar"
              />
              <div className="text-center">
                <h3 className="text-lg font-semibold text-card-foreground">
                  {robloxUser?.displayName || robloxUser?.username}
                </h3>
                <p className="text-muted-foreground">@{robloxUser?.username}</p>
              </div>
            </div>

            <div className="text-center">
              <Button
                onClick={() => {
                  // Just move to next step instead of calling API
                  onFriendAdded(robloxUser?.username || robloxUsername);
                }}
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-8 glow-effect hover:scale-[1.02] transition-all duration-200"
                data-testid="button-add-friend"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Continue
              </Button>
            </div>
          </div>
        )}

        {error && (
          <Alert className="mt-6 border-destructive/20 bg-destructive/10" data-testid="alert-error">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">
              <strong>Username Not Found</strong>
              <p className="text-sm mt-1" data-testid="text-error-message">{error}</p>
              <div className="mt-3 text-xs">
                <p><strong>Tips:</strong></p>
                <p>• Check the spelling carefully (usernames are case-sensitive)</p>
                <p>• Make sure the user exists on Roblox</p>
                <p>• Try copying and pasting the username from Roblox</p>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}