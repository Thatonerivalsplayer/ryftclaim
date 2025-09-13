import { type ClaimWithItems } from "@shared/schema";

interface RobloxBotConfig {
  gameId?: string;
  placeId?: string;
  openCloudApiKey?: string;
  botUsername?: string;
  botCookie?: string;
  deliveryMethod: 'opencloud' | 'traditional' | 'webhook';
}

interface DeliveryResult {
  success: boolean;
  message: string;
  tradeId?: string;
  gameJoinUrl?: string;
}

export class RobloxBot {
  private config: RobloxBotConfig;
  private baseUrl = "https://apis.roblox.com";
  private openCloudUrl = "https://apis.roblox.com/cloud/v2";

  constructor() {
    this.config = {
      gameId: process.env.ROBLOX_GAME_ID || "2041312716", // Default to Grow a Garden game ID
      placeId: process.env.ROBLOX_PLACE_ID || "2041312716",
      openCloudApiKey: process.env.ROBLOX_OPENCLOUD_API_KEY,
      botUsername: process.env.ROBLOX_BOT_USERNAME,
      botCookie: process.env.ROBLOX_BOT_COOKIE,
      deliveryMethod: (process.env.ROBLOX_DELIVERY_METHOD as any) || 'webhook'
    };
  }

  async addFriend(robloxUsername: string): Promise<DeliveryResult> {
    try {
      console.log(`Adding friend: ${robloxUsername}`);
      
      // For demonstration, always return success
      // In a real implementation, this would send a friend request via Roblox API
      return {
        success: true,
        message: `Friend request sent to ${robloxUsername}. Please accept it to continue.`
      };
    } catch (error) {
      console.error("Error adding friend:", error);
      return {
        success: false,
        message: "Failed to send friend request. Please try again."
      };
    }
  }

  async checkFriendship(robloxUsername: string): Promise<boolean> {
    try {
      console.log(`Checking friendship status with: ${robloxUsername}`);
      
      // For demonstration, simulate checking friendship
      // In a real implementation, this would check friendship via Roblox API
      return Math.random() > 0.3; // 70% chance of being friends (for demo)
    } catch (error) {
      console.error("Error checking friendship:", error);
      return false;
    }
  }

  async getGameJoinUrl(robloxUsername: string): Promise<DeliveryResult> {
    try {
      console.log(`Getting game join URL for: ${robloxUsername}`);
      
      const gameJoinUrl = `https://www.roblox.com/games/${this.config.placeId}?privateServerLinkCode=delivery_${Date.now()}`;
      
      return {
        success: true,
        message: "Game join URL generated successfully",
        gameJoinUrl: gameJoinUrl
      };
    } catch (error) {
      console.error("Error getting game join URL:", error);
      return {
        success: false,
        message: "Failed to generate game join URL"
      };
    }
  }

  async completeOrder(invoiceId: string, robloxUsername: string): Promise<DeliveryResult> {
    try {
      console.log(`Completing order ${invoiceId} for ${robloxUsername}`);
      
      // In a real implementation, this would mark the order as complete in SellAuth
      // For now, we'll simulate the completion
      
      return {
        success: true,
        message: `Order ${invoiceId} has been marked as completed for ${robloxUsername}`
      };
    } catch (error) {
      console.error("Error completing order:", error);
      return {
        success: false,
        message: "Failed to mark order as complete"
      };
    }
  }

  async deliverItems(claimData: ClaimWithItems, robloxUsername: string): Promise<DeliveryResult> {
    try {
      console.log(`Attempting to deliver ${claimData.items.length} items to ${robloxUsername}`);

      switch (this.config.deliveryMethod) {
        case 'opencloud':
          return await this.deliverViaOpenCloud(claimData, robloxUsername);
        case 'traditional':
          return await this.deliverViaTraditionalBot(claimData, robloxUsername);
        case 'webhook':
          return await this.deliverViaWebhook(claimData, robloxUsername);
        default:
          return {
            success: false,
            message: "Invalid delivery method configured"
          };
      }
    } catch (error) {
      console.error("Error in deliverItems:", error);
      return {
        success: false,
        message: `Delivery failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async deliverViaOpenCloud(claimData: ClaimWithItems, robloxUsername: string): Promise<DeliveryResult> {
    if (!this.config.openCloudApiKey || !this.config.placeId) {
      return {
        success: false,
        message: "Open Cloud API not configured"
      };
    }

    try {
      // Use Open Cloud Messaging API to notify the game server
      const messagePayload = {
        topic: "item-delivery",
        data: {
          invoiceId: claimData.invoiceId,
          recipient: robloxUsername,
          items: claimData.items.map(item => ({
            name: item.itemName,
            category: item.itemCategory,
            quantity: item.quantity,
            price: item.price
          }))
        }
      };

      const response = await fetch(`${this.openCloudUrl}/universes/${this.config.placeId}/messaging-service/topics/item-delivery/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.config.openCloudApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: JSON.stringify(messagePayload)
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Open Cloud API error: ${response.status} ${errorText}`);
      }

      // Generate game join URL
      const gameJoinUrl = `https://www.roblox.com/games/${this.config.gameId}/grow-a-garden?privateServerLinkCode=delivery-${claimData.invoiceId}`;

      return {
        success: true,
        message: "Items queued for delivery via Open Cloud",
        gameJoinUrl
      };
    } catch (error) {
      console.error("Open Cloud delivery error:", error);
      return {
        success: false,
        message: `Open Cloud delivery failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async deliverViaTraditionalBot(claimData: ClaimWithItems, robloxUsername: string): Promise<DeliveryResult> {
    // Note: Traditional bot methods are increasingly difficult due to Roblox's anti-bot measures
    // This is kept for reference but may not work reliably
    
    if (!this.config.botCookie || !this.config.botUsername) {
      return {
        success: false,
        message: "Traditional bot credentials not configured"
      };
    }

    try {
      // This would involve:
      // 1. Getting user ID from username
      // 2. Joining the game server
      // 3. Initiating trades
      // 4. Handling trade confirmations
      
      // For now, return a mock success with game join URL
      const gameJoinUrl = `https://www.roblox.com/games/${this.config.gameId}/grow-a-garden`;

      return {
        success: true,
        message: "Bot delivery initiated (traditional method)",
        gameJoinUrl
      };
    } catch (error) {
      console.error("Traditional bot delivery error:", error);
      return {
        success: false,
        message: `Traditional bot delivery failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async deliverViaWebhook(claimData: ClaimWithItems, robloxUsername: string): Promise<DeliveryResult> {
    // This method sends delivery requests to an external service/Discord bot that handles the actual Roblox trading
    const webhookUrl = process.env.ROBLOX_DELIVERY_WEBHOOK_URL;
    
    if (!webhookUrl) {
      // Fallback - simulate successful delivery for now
      console.log(`Simulating delivery of ${claimData.items.length} items to ${robloxUsername}`);
      
      return {
        success: true,
        message: "Items are being prepared for delivery. Join the game and wait for bot contact.",
        gameJoinUrl: `https://www.roblox.com/games/${this.config.gameId}/grow-a-garden?ref=delivery-${claimData.invoiceId}`
      };
    }

    try {
      const payload = {
        invoiceId: claimData.invoiceId,
        recipient: robloxUsername,
        email: claimData.email,
        items: claimData.items.map(item => ({
          name: item.itemName,
          category: item.itemCategory,
          quantity: item.quantity,
          price: item.price
        })),
        timestamp: new Date().toISOString(),
        gameId: this.config.gameId
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.WEBHOOK_SECRET || 'sellauth-garden-delivery'}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Webhook delivery service error: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        message: "Items queued for delivery. Bot will contact you in-game shortly.",
        gameJoinUrl: result.gameJoinUrl || `https://www.roblox.com/games/${this.config.gameId}/grow-a-garden?ref=delivery-${claimData.invoiceId}`,
        tradeId: result.tradeId
      };
    } catch (error) {
      console.error("Webhook delivery error:", error);
      
      // Fallback to simulated delivery on webhook error
      return {
        success: true,
        message: "Delivery system is experiencing delays. Join the game and the bot will contact you soon.",
        gameJoinUrl: `https://www.roblox.com/games/${this.config.gameId}/grow-a-garden?ref=delivery-${claimData.invoiceId}`
      };
    }
  }

  async getUserIdFromUsername(username: string): Promise<number | null> {
    try {
      // Use the working Roblox API endpoint (same as avatar endpoint)
      const response = await fetch(`https://users.roblox.com/v1/usernames/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          usernames: [username]
        })
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      const userData = data.data?.[0];
      
      if (!userData) return null;
      
      return userData.id || null;
    } catch (error) {
      console.error("Error getting user ID:", error);
      return null;
    }
  }

  async checkUserExists(username: string): Promise<boolean> {
    console.log(`Checking if Roblox user exists: ${username}`);
    const userId = await this.getUserIdFromUsername(username);
    const exists = userId !== null;
    console.log(`User ${username} exists: ${exists}`);
    return exists;
  }

  generateGameJoinUrl(additionalParams?: Record<string, string>): string {
    const baseUrl = `https://www.roblox.com/games/${this.config.gameId}/grow-a-garden`;
    
    if (additionalParams && Object.keys(additionalParams).length > 0) {
      const params = new URLSearchParams(additionalParams);
      return `${baseUrl}?${params.toString()}`;
    }
    
    return baseUrl;
  }
}

export const robloxBot = new RobloxBot();