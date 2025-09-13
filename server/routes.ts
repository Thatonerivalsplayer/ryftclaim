import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { robloxBot } from "./roblox-bot";
import { verifyClaimSchema, botJoinSchema, createTicketSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Verify claim endpoint
  app.post("/api/claims/verify", async (req, res) => {
    try {
      const { invoiceId, email } = verifyClaimSchema.parse(req.body);
      
      // Get claim by invoice ID
      const claimWithItems = await storage.getClaimByInvoiceId(invoiceId);
      
      if (!claimWithItems) {
        return res.status(404).json({ 
          message: "Invoice ID not found. Please check your invoice number and try again." 
        });
      }
      
      // Check if invoice was invalidated by staff (BLOCKED means staff invalidated it)
      if (claimWithItems.claimId === 'BLOCKED' || claimWithItems.claimId.startsWith('INVALIDATED-')) {
        return res.status(400).json({ 
          message: "This invoice ID has been claimed." 
        });
      }
      
      // Check if already claimed, but allow if not verified yet
      if (claimWithItems.claimed && claimWithItems.verified) {
        return res.status(400).json({ 
          message: "This invoice ID has already been claimed and processed." 
        });
      }
      
      // Verify email matches
      if (claimWithItems.email.toLowerCase() !== email.toLowerCase()) {
        return res.status(400).json({ 
          message: "This invoice ID is not valid, if you think this is a mistake. contact us through our discord server." 
        });
      }
      
      // Mark claim as verified - store in cache using the ORIGINAL invoice ID
      console.log(`Marking claim as verified: ${claimWithItems.id} for invoice ${invoiceId}`);
      await storage.updateClaimVerification(claimWithItems.id, true);
      
      // ALSO update cache using the original invoice ID for future lookups
      await storage.updateClaimVerificationByInvoiceId(invoiceId, true);
      
      res.json({
        success: true,
        claim: claimWithItems,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: error.errors[0]?.message || "Invalid input data" 
        });
      }
      
      console.error("Claim verification error:", error);
      res.status(500).json({ 
        message: "Internal server error. Please try again later." 
      });
    }
  });

  // Get claim by invoice ID
  app.get("/api/claims/:invoiceId", async (req, res) => {
    try {
      const { invoiceId } = req.params;
      
      const claimWithItems = await storage.getClaimByInvoiceId(invoiceId);
      
      if (!claimWithItems) {
        return res.status(404).json({ 
          message: "Claim not found" 
        });
      }
      
      res.json(claimWithItems);
    } catch (error) {
      console.error("Get claim error:", error);
      res.status(500).json({ 
        message: "Internal server error" 
      });
    }
  });

  // Mark items as delivered
  app.post("/api/claims/:invoiceId/deliver", async (req, res) => {
    try {
      const { invoiceId } = req.params;
      const { itemIds } = req.body;
      
      const claimWithItems = await storage.getClaimByInvoiceId(invoiceId);
      
      if (!claimWithItems) {
        return res.status(404).json({ 
          message: "Claim not found" 
        });
      }
      
      if (!claimWithItems.verified) {
        return res.status(400).json({ 
          message: "Claim not verified" 
        });
      }
      
      // Mark specified items as delivered
      const deliveredItems = [];
      for (const itemId of itemIds) {
        const item = await storage.updateClaimItemDelivery(itemId, true);
        if (item) {
          deliveredItems.push(item);
        }
      }
      
      res.json({
        success: true,
        deliveredItems,
      });
    } catch (error) {
      console.error("Delivery error:", error);
      res.status(500).json({ 
        message: "Internal server error" 
      });
    }
  });

  // Get Roblox user avatar endpoint  
  app.get("/api/roblox/avatar/:username", async (req, res) => {
    try {
      const { username } = req.params;
      
      // Get user ID from username using the working API endpoint
      const userResponse = await fetch(`https://users.roblox.com/v1/usernames/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          usernames: [username]
        })
      });
      
      if (!userResponse.ok) {
        return res.status(404).json({ 
          success: false, 
          message: "User not found" 
        });
      }
      
      const userResponseData = await userResponse.json();
      const userData = userResponseData.data?.[0];
      
      if (!userData) {
        return res.status(404).json({ 
          success: false, 
          message: "User not found" 
        });
      }
      
      const userId = userData.id;
      
      // Get avatar thumbnail
      const avatarResponse = await fetch(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=150x150&format=Png`);
      if (!avatarResponse.ok) {
        return res.status(404).json({ 
          success: false, 
          message: "Avatar not found" 
        });
      }
      
      const avatarData = await avatarResponse.json();
      const avatarUrl = avatarData.data[0]?.imageUrl;
      
      res.json({
        success: true,
        userId: userId,
        username: userData.name,
        displayName: userData.displayName,
        avatarUrl: avatarUrl,
        hasVerifiedBadge: userData.hasVerifiedBadge
      });
    } catch (error) {
      console.error("Error fetching avatar:", error);
      res.status(500).json({ 
        success: false,
        message: "Internal server error" 
      });
    }
  });

  // Discord user lookup endpoint
  app.get("/api/discord/user/:username", async (req, res) => {
    try {
      const { username } = req.params;
      
      // Import Discord bot functions dynamically to avoid startup issues
      const { getDiscordUser } = await import('./discord-bot');
      
      const userResult = await getDiscordUser(username);
      
      res.json(userResult);
    } catch (error) {
      console.error("Discord user lookup error:", error);
      res.status(500).json({ 
        success: false,
        message: "Internal server error" 
      });
    }
  });

  // Create Discord ticket endpoint
  app.post("/api/discord/create-ticket", async (req, res) => {
    try {
      const { invoiceId, email, robloxUsername, discordUsername, discordUserId, items } = createTicketSchema.parse(req.body);
      
      console.log(`🎫 Creating Discord ticket for ${invoiceId} - Discord: ${discordUsername} (${discordUserId}), Roblox: ${robloxUsername}`);
      
      // Import Discord bot functions dynamically to avoid startup issues
      const { createDeliveryChannel } = await import('./discord-bot');
      
      // Create delivery channel for this order
      const channelResult = await createDeliveryChannel({
        invoiceId,
        email,
        robloxUsername,
        discordUsername,
        items,
        userId: discordUserId
      });
      
      console.log(`🎫 Ticket creation result:`, channelResult);
      
      if (channelResult.success) {
        res.json({
          success: true,
          message: `Discord ticket #${channelResult.channelName} created successfully!`,
          inviteUrl: "https://discord.gg/ryftstock",
          channelName: channelResult.channelName,
          channelId: channelResult.channelId,
          userAdded: channelResult.userAdded
        });
      } else {
        res.json({
          success: false,
          message: channelResult.message || "Failed to create Discord ticket. Please try again or contact support.",
          userAdded: false
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false,
          message: error.errors[0]?.message || "Invalid request data. Missing required fields." 
        });
      }
      
      console.error("Discord ticket creation error:", error);
      res.status(500).json({ 
        success: false,
        message: "Internal server error" 
      });
    }
  });

  // Bot add friend endpoint
  app.post("/api/bot/add-friend", async (req, res) => {
    try {
      const { invoiceId, robloxUsername } = botJoinSchema.parse(req.body);
      
      console.log(`Bot add friend request: ${invoiceId}, username: ${robloxUsername}`);
      
      const claimWithItems = await storage.getClaimByInvoiceId(invoiceId);
      
      if (!claimWithItems) {
        console.log(`Claim not found for invoice: ${invoiceId}`);
        return res.status(404).json({ 
          message: "Claim not found" 
        });
      }
      
      console.log(`Claim found for ${claimWithItems.invoiceId} (original: ${invoiceId}), verified: ${claimWithItems.verified}`);
      
      if (!claimWithItems.verified) {
        console.log(`Claim ${invoiceId} is not verified`);
        return res.status(400).json({ 
          message: "Claim not verified" 
        });
      }
      
      // Verify Roblox username exists
      const userExists = await robloxBot.checkUserExists(robloxUsername);
      if (!userExists) {
        return res.status(400).json({
          message: "Roblox username not found. Please check spelling and try again."
        });
      }
      
      // Add friend request
      const friendResult = await robloxBot.addFriend(robloxUsername);
      
      res.json({
        success: friendResult.success,
        message: friendResult.message
      });
    } catch (error) {
      console.error("Add friend error:", error);
      res.status(500).json({ 
        message: "Internal server error" 
      });
    }
  });

  // Bot check friend endpoint
  app.post("/api/bot/check-friend", async (req, res) => {
    try {
      const { invoiceId, robloxUsername } = botJoinSchema.parse(req.body);
      
      // Check if user is friend of bot
      const isFriend = await robloxBot.checkFriendship(robloxUsername);
      
      res.json({
        success: true,
        isFriend: isFriend
      });
    } catch (error) {
      console.error("Check friend error:", error);
      res.status(500).json({ 
        message: "Internal server error" 
      });
    }
  });

  // Bot join game endpoint
  app.post("/api/bot/join-game", async (req, res) => {
    try {
      const { invoiceId, robloxUsername } = botJoinSchema.parse(req.body);
      
      const claimWithItems = await storage.getClaimByInvoiceId(invoiceId);
      
      if (!claimWithItems) {
        return res.status(404).json({ 
          message: "Claim not found" 
        });
      }
      
      // Get game join URL
      const joinResult = await robloxBot.getGameJoinUrl(robloxUsername);
      
      res.json({
        success: joinResult.success,
        gameJoinUrl: joinResult.gameJoinUrl,
        message: joinResult.message
      });
    } catch (error) {
      console.error("Join game error:", error);
      res.status(500).json({ 
        message: "Internal server error" 
      });
    }
  });

  // Discord webhook endpoint for creating delivery tickets (PetMart.fun style)
  app.post("/api/discord/create-delivery-ticket", async (req, res) => {
    try {
      const { invoiceId, robloxUsername, items } = req.body;
      
      console.log(`Creating PetMart.fun style delivery ticket for order ${invoiceId}:`);
      console.log(`- Roblox: ${robloxUsername}`);
      console.log(`- Items: ${items.length} item(s)`);
      
      res.json({
        success: true,
        message: "Delivery ticket created - staff will contact you in Discord"
      });
    } catch (error) {
      console.error("Discord delivery ticket creation error:", error);
      res.status(500).json({ 
        message: "Internal server error" 
      });
    }
  });

  // Notify staff that customer is ready for delivery
  app.post("/api/delivery/notify-ready", async (req, res) => {
    try {
      const { invoiceId, robloxUsername } = req.body;
      
      console.log(`Customer ${robloxUsername} ready for delivery (Order: ${invoiceId})`);
      
      // Simulate staff assignment
      const staffMembers = ["DeliveryBot_Admin", "GardenBot_Staff", "PetMart_Helper"];
      const staffMember = staffMembers[Math.floor(Math.random() * staffMembers.length)];
      const serverCode = "GB-" + Math.random().toString(36).substr(2, 5).toUpperCase();
      
      res.json({
        success: true,
        staffAssigned: true,
        staffMember: staffMember,
        serverCode: serverCode,
        message: "Staff member assigned for direct trading"
      });
    } catch (error) {
      console.error("Staff notification error:", error);
      res.status(500).json({ 
        message: "Internal server error" 
      });
    }
  });

  // Discord bot user authorization endpoint
  app.post("/api/discord/authorize-user", async (req, res) => {
    try {
      const { invoiceId, email, robloxUsername, items } = req.body;
      
      console.log(`🎯 Discord authorization called for ${invoiceId} - ${robloxUsername}`);
      console.log(`🎯 Items count: ${items?.length || 0}`);
      
      // Import Discord bot functions dynamically to avoid startup issues
      const { addUserToServer, createDeliveryChannel } = await import('./discord-bot');
      
      // Create delivery channel for this order
      console.log(`🎯 About to call createDeliveryChannel...`);
      const channelResult = await createDeliveryChannel({
        invoiceId,
        email,
        robloxUsername,
        items
      });
      
      console.log(`🎯 Channel creation result:`, channelResult);
      
      if (channelResult.success) {
        res.json({
          success: true,
          message: `Discord authorization successful! Channel #${channelResult.channelName} created.`,
          inviteUrl: "https://discord.gg/ryftstock",
          channelName: channelResult.channelName,
          channelId: channelResult.channelId
        });
      } else {
        // Fallback to legacy authorization if channel creation fails
        const result = await addUserToServer({
          invoiceId,
          email,
          robloxUsername,
          items
        });
        res.json(result);
      }
    } catch (error) {
      console.error("Discord authorization error:", error);
      res.status(500).json({ 
        success: false,
        message: "Internal server error" 
      });
    }
  });


  // Order completion endpoint
  app.post("/api/orders/complete", async (req, res) => {
    try {
      const { invoiceId, robloxUsername } = req.body;
      
      // Mark order as complete in SellAuth
      const completionResult = await robloxBot.completeOrder(invoiceId, robloxUsername);
      
      res.json({
        success: completionResult.success,
        message: completionResult.message
      });
    } catch (error) {
      console.error("Order completion error:", error);
      res.status(500).json({ 
        message: "Internal server error" 
      });
    }
  });

  // Bot join endpoint with real Roblox integration
  app.post("/api/bot/join", async (req, res) => {
    try {
      const { invoiceId, robloxUsername } = botJoinSchema.parse(req.body);
      
      const claimWithItems = await storage.getClaimByInvoiceId(invoiceId);
      
      if (!claimWithItems) {
        return res.status(404).json({ 
          message: "Claim not found" 
        });
      }
      
      if (!claimWithItems.verified) {
        return res.status(400).json({ 
          message: "Claim not verified" 
        });
      }
      
      // No need to verify username match since it's not stored in the claim initially
      
      // Verify Roblox username exists
      const userExists = await robloxBot.checkUserExists(robloxUsername);
      if (!userExists) {
        return res.status(400).json({
          message: "Roblox username not found. Please check spelling and try again."
        });
      }
      
      // Initiate item delivery via Roblox bot
      const deliveryResult = await robloxBot.deliverItems(claimWithItems, robloxUsername);
      
      if (!deliveryResult.success) {
        return res.status(400).json({
          message: deliveryResult.message
        });
      }
      
      res.json({
        success: true,
        botJoinUrl: deliveryResult.gameJoinUrl,
        message: deliveryResult.message,
        tradeId: deliveryResult.tradeId
      });
    } catch (error) {
      console.error("Bot join error:", error);
      res.status(500).json({ 
        message: "Internal server error" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
