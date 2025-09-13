import { useState } from "react";
import { Sprout, MessageSquareDiff, Twitter, Youtube } from "lucide-react";
import { ClaimForm } from "@/components/claim-form";
import { ProductDisplay } from "@/components/product-display";
import { UsernameCollection } from "@/components/username-collection";
import { FriendDetection } from "@/components/friend-detection";
import { DiscordVerification } from "@/components/discord-verification";
import { TicketCompletion } from "@/components/ticket-completion";
import { StepIndicator } from "@/components/step-indicator";
import type { ClaimWithItems } from "@shared/schema";
import logoImage from "@assets/ChatGPT Image Sep 9, 2025, 09_20_02 AM_1757408594739.png";

export default function ClaimPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [claimData, setClaimData] = useState<ClaimWithItems | null>(null);
  const [robloxUsername, setRobloxUsername] = useState<string>("");
  const [discordUsername, setDiscordUsername] = useState<string>("");
  const [discordUserId, setDiscordUserId] = useState<string>("");

  const handleVerificationSuccess = (data: ClaimWithItems) => {
    setClaimData(data);
    setCurrentStep(2);
  };

  const handleProceedToUsername = () => {
    setCurrentStep(3);
  };

  const handleFriendAdded = (robloxUsername: string) => {
    setRobloxUsername(robloxUsername);
    setCurrentStep(4);
  };

  const handleFriendConfirmed = () => {
    setCurrentStep(5); // Go to Discord verification
  };

  const handleDiscordVerified = (username: string, userId: string) => {
    setDiscordUsername(username);
    setDiscordUserId(userId);
    setCurrentStep(6); // Go to ticket completion
  };

  const handleStartOver = () => {
    setCurrentStep(1);
    setClaimData(null);
    setRobloxUsername("");
    setDiscordUsername("");
    setDiscordUserId("");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary opacity-90"></div>
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ 
            backgroundImage: "url('https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&h=600')" 
          }}
        ></div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <nav className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src={logoImage} 
                alt="Ryft Stock Logo" 
                className="w-10 h-10 rounded-lg object-cover"
              />
              <div>
                <h1 className="text-xl font-bold text-white" data-testid="site-title">Ryft Stock</h1>
                <p className="text-sm text-gray-200">Grow a Garden</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <a 
                href="https://discord.gg/aR8wsRYrHK" 
                className="text-gray-200 hover:text-white transition-colors"
                data-testid="link-discord"
              >
                <MessageSquareDiff className="text-xl" />
              </a>
            </div>
          </nav>
          
          <div className="text-center py-16">
            <h2 className="text-5xl font-bold text-white mb-6 tracking-tight">
              Garden Items Delivery
            </h2>
            <p className="text-xl text-gray-200 max-w-2xl mx-auto leading-relaxed">
              Fast and secure delivery of your Roblox garden items. Complete verification in minutes.
            </p>
          </div>
        </div>
      </header>

      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Step Content */}
        <>
          {currentStep === 1 && (
            <ClaimForm onSuccess={handleVerificationSuccess} />
          )}

          {currentStep === 2 && claimData && (
            <ProductDisplay 
              claimData={claimData} 
              onProceed={handleProceedToUsername} 
            />
          )}

          {currentStep === 3 && claimData && (
            <UsernameCollection 
              claimData={claimData}
              onFriendAdded={handleFriendAdded}
            />
          )}

          {currentStep === 4 && claimData && robloxUsername && (
            <FriendDetection 
              claimData={claimData}
              robloxUsername={robloxUsername}
              onFriendConfirmed={handleFriendConfirmed}
            />
          )}

          {currentStep === 5 && claimData && robloxUsername && (
            <DiscordVerification 
              claimData={claimData}
              robloxUsername={robloxUsername}
              onDiscordVerified={handleDiscordVerified}
            />
          )}

          {currentStep === 6 && claimData && robloxUsername && discordUsername && discordUserId && (
            <TicketCompletion 
              claimData={claimData}
              robloxUsername={robloxUsername}
              discordUsername={discordUsername}
              discordUserId={discordUserId}
              onClaimAnother={handleStartOver}
            />
          )}

{/* OrderCompletion removed - GameJoin is now the final step */}
        </>
      </main>

      {/* Footer */}
      <footer className="bg-muted py-12 mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <img 
                  src={logoImage} 
                  alt="Ryft Stock Logo" 
                  className="w-6 h-6 rounded object-cover"
                />
                <span className="font-bold text-lg">Ryft Stock</span>
              </div>
              <p className="text-muted-foreground text-sm">
                Secure and fast delivery of Roblox garden items. Trusted by thousands of customers worldwide.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="https://discord.gg/aR8wsRYrHK" className="text-muted-foreground hover:text-primary transition-colors">
                    Discord Server
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    FAQ
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Information</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                    Refund Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-8 text-center">
            <p className="text-muted-foreground text-sm">
              © 2025 Ryft Stock. All rights reserved. Fast and secure Roblox item delivery service.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}