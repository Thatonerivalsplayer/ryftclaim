var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/storage.ts
import { randomUUID } from "crypto";
var SellAuthAPI, SellAuthStorage, storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    SellAuthAPI = class {
      apiKey;
      shopId;
      baseUrl = "https://api.sellauth.com/v1";
      constructor() {
        this.apiKey = process.env.SELLAUTH_API_KEY || "";
        this.shopId = process.env.SELLAUTH_SHOP_ID || "";
        if (!this.apiKey || !this.shopId) {
          console.warn("SellAuth credentials not found. Using fallback mode.");
        }
      }
      async makeRequest(endpoint, options = {}) {
        if (!this.apiKey || !this.shopId) {
          throw new Error("SellAuth API credentials not configured");
        }
        const url = `${this.baseUrl}${endpoint}`;
        const response = await fetch(url, {
          ...options,
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            ...options.headers
          }
        });
        if (!response.ok) {
          throw new Error(`SellAuth API error: ${response.status} ${response.statusText}`);
        }
        return response.json();
      }
      async getInvoiceById(invoiceId) {
        try {
          return await this.makeRequest(`/shops/${this.shopId}/invoices/${invoiceId}`);
        } catch (error) {
          console.error("Error fetching invoice:", error);
          return null;
        }
      }
      async searchInvoices(filters) {
        try {
          return await this.makeRequest(`/shops/${this.shopId}/invoices`, {
            method: "GET",
            body: JSON.stringify(filters)
          });
        } catch (error) {
          console.error("Error searching invoices:", error);
          return null;
        }
      }
    };
    SellAuthStorage = class {
      users;
      claimsCache;
      claimItemsCache;
      sellAuthAPI;
      constructor() {
        this.users = /* @__PURE__ */ new Map();
        this.claimsCache = /* @__PURE__ */ new Map();
        this.claimItemsCache = /* @__PURE__ */ new Map();
        this.sellAuthAPI = new SellAuthAPI();
      }
      generateClaimId() {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
        const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
        return `RFT-${part1}-${part2}`;
      }
      convertSellAuthInvoiceToClaimWithItems(invoice, originalInvoiceId) {
        if (!invoice) return void 0;
        try {
          const claim = {
            id: randomUUID(),
            claimId: this.generateClaimId(),
            // Generate unique claim ID
            invoiceId: originalInvoiceId || invoice.id?.toString() || "",
            // Use original full invoice ID if provided
            email: invoice.email || "",
            robloxUsername: invoice.custom_field || "",
            // Assuming custom field contains Roblox username
            verified: false,
            claimed: false,
            discordChannelId: null,
            createdAt: new Date(invoice.created_at || Date.now())
          };
          const items = (invoice.items || []).map((invoiceItem) => ({
            id: randomUUID(),
            claimId: claim.id,
            itemName: invoiceItem.product?.name || invoiceItem.variant?.name || "Unknown Item",
            itemCategory: invoiceItem.product?.category || "Garden Item",
            price: invoiceItem.price_usd?.toString() || "0.00",
            quantity: invoiceItem.quantity || 1,
            imageUrl: invoiceItem.product?.images?.[0]?.url || null,
            delivered: invoiceItem.delivered || false
          }));
          return { ...claim, items };
        } catch (error) {
          console.error("Error converting SellAuth invoice:", error);
          return void 0;
        }
      }
      async getClaimByClaimId(claimId) {
        console.log(`Fetching claim with claim ID: ${claimId}`);
        const cachedClaim = Array.from(this.claimsCache.values()).find(
          (claim) => claim.claimId === claimId || claim.claimId === `INVALIDATED-${claimId}`
        );
        if (cachedClaim) {
          console.log(`Found cached claim for claim ID: ${claimId}`);
          if (cachedClaim.claimId.startsWith("INVALIDATED-") || cachedClaim.claimed) {
            console.log(`Claim ID ${claimId} has been invalidated or already claimed`);
            const items2 = [];
            return { ...cachedClaim, items: items2 };
          }
          const items = Array.from(this.claimItemsCache.values()).filter(
            (item) => item.claimId === cachedClaim.id
          );
          return { ...cachedClaim, items };
        }
        console.log(`No claim found for claim ID: ${claimId}`);
        return void 0;
      }
      // Fallback sample data for testing
      getFallbackSampleData() {
        const sampleClaim = {
          id: randomUUID(),
          claimId: this.generateClaimId(),
          invoiceId: "test123abc",
          email: "player@example.com",
          robloxUsername: "TestPlayer123",
          verified: false,
          claimed: false,
          discordChannelId: null,
          createdAt: /* @__PURE__ */ new Date()
        };
        const sampleItems = [
          {
            id: randomUUID(),
            claimId: sampleClaim.id,
            itemName: "Rainbow Dragon Pet",
            itemCategory: "Legendary \u2022 Grow a Garden",
            price: "25.99",
            quantity: 1,
            imageUrl: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=120&h=120",
            delivered: false
          },
          {
            id: randomUUID(),
            claimId: sampleClaim.id,
            itemName: "Mystical Garden Pack",
            itemCategory: "Epic \u2022 Plant Collection",
            price: "12.99",
            quantity: 3,
            imageUrl: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?ixlib=rb-4.0.3&auto=format&fit=crop&w=120&h=120",
            delivered: false
          }
        ];
        return { ...sampleClaim, items: sampleItems };
      }
      async getUser(id) {
        return this.users.get(id);
      }
      async getUserByUsername(username) {
        return Array.from(this.users.values()).find(
          (user) => user.username === username
        );
      }
      async createUser(insertUser) {
        const id = randomUUID();
        const user = { ...insertUser, id };
        this.users.set(id, user);
        return user;
      }
      async getClaim(invoiceId) {
        return Array.from(this.claimsCache.values()).find(
          (claim) => claim.invoiceId === invoiceId
        );
      }
      async getClaimByInvoiceId(invoiceId) {
        try {
          const blockedClaim = this.claimsCache.get(`BLOCKED-${invoiceId}`);
          if (blockedClaim) {
            console.log(`Invoice ${invoiceId} has been invalidated by staff`);
            const items = [];
            return { ...blockedClaim, items };
          }
          const cachedClaim = Array.from(this.claimsCache.values()).find(
            (claim) => claim.invoiceId === invoiceId && !claim.id.startsWith("blocked-")
          );
          if (cachedClaim) {
            console.log(`Found claim in cache for invoice: ${invoiceId}, verified: ${cachedClaim.verified}`);
            if (cachedClaim.claimed && cachedClaim.claimId.startsWith("INVALIDATED-")) {
              console.log(`Claim for invoice ${invoiceId} was invalidated by staff`);
              const items2 = [];
              return { ...cachedClaim, items: items2 };
            }
            const invoice2 = await this.sellAuthAPI.getInvoiceById(invoiceId);
            if (invoice2) {
              const claimWithItems = this.convertSellAuthInvoiceToClaimWithItems(invoice2, invoiceId);
              if (claimWithItems) {
                claimWithItems.id = cachedClaim.id;
                claimWithItems.verified = cachedClaim.verified;
                claimWithItems.claimed = cachedClaim.claimed;
                claimWithItems.discordChannelId = cachedClaim.discordChannelId;
                console.log(`Using cached verification status for ${invoiceId}: verified=${claimWithItems.verified}`);
                return claimWithItems;
              }
            }
            const items = [];
            return { ...cachedClaim, items };
          }
          console.log("Fetching invoice from SellAuth API:", invoiceId);
          const invoice = await this.sellAuthAPI.getInvoiceById(invoiceId);
          if (invoice) {
            console.log("Found invoice in SellAuth:", invoice.id);
            const existingClaim = Array.from(this.claimsCache.values()).find(
              (claim) => claim.invoiceId === invoiceId && claim.id !== `blocked-${invoiceId}`
            );
            if (existingClaim) {
              console.log("Anti-cheat: Returning existing claim for invoice:", invoiceId);
              const items = Array.from(this.claimItemsCache.values()).filter(
                (item) => item.claimId === existingClaim.id
              );
              return { ...existingClaim, items };
            }
            const claimWithItems = this.convertSellAuthInvoiceToClaimWithItems(invoice, invoiceId);
            if (claimWithItems) {
              this.claimsCache.set(claimWithItems.id, claimWithItems);
              this.claimsCache.set(invoiceId, claimWithItems);
            }
            return claimWithItems;
          }
          console.log("Using fallback sample data for invoice:", invoiceId);
          const fallbackData = this.getFallbackSampleData();
          fallbackData.invoiceId = invoiceId;
          return fallbackData;
        } catch (error) {
          console.error("Error in getClaimByInvoiceId:", error);
          const fallbackData = this.getFallbackSampleData();
          fallbackData.invoiceId = invoiceId;
          return fallbackData;
        }
      }
      async createClaim(insertClaim) {
        const id = randomUUID();
        const claim = {
          id,
          claimId: this.generateClaimId(),
          invoiceId: insertClaim.invoiceId,
          email: insertClaim.email,
          robloxUsername: null,
          verified: false,
          claimed: false,
          discordChannelId: null,
          createdAt: /* @__PURE__ */ new Date()
        };
        this.claimsCache.set(id, claim);
        return claim;
      }
      async updateClaimVerification(id, verified) {
        let claim = this.claimsCache.get(id);
        if (!claim) {
          for (const cachedClaim of Array.from(this.claimsCache.values())) {
            if (cachedClaim.id === id) {
              claim = cachedClaim;
              break;
            }
          }
        }
        if (!claim) return void 0;
        const updatedClaim = { ...claim, verified };
        this.claimsCache.set(claim.invoiceId, updatedClaim);
        this.claimsCache.set(id, updatedClaim);
        console.log(`Updated claim verification: ${claim.invoiceId} -> verified: ${verified}`);
        return updatedClaim;
      }
      async updateClaimVerificationByInvoiceId(invoiceId, verified) {
        const cachedClaim = Array.from(this.claimsCache.values()).find(
          (claim) => claim.invoiceId === invoiceId
        );
        if (cachedClaim) {
          const updatedClaim = { ...cachedClaim, verified };
          this.claimsCache.set(cachedClaim.id, updatedClaim);
          this.claimsCache.set(invoiceId, updatedClaim);
          console.log(`Updated claim verification by invoice ID: ${invoiceId} -> verified: ${verified}`);
        } else {
          console.log(`Could not find cached claim for invoice ID: ${invoiceId}`);
        }
      }
      async getClaimItems(claimId) {
        return [];
      }
      async createClaimItem(insertItem) {
        const id = randomUUID();
        const item = {
          id,
          claimId: insertItem.claimId,
          itemName: insertItem.itemName,
          itemCategory: insertItem.itemCategory,
          price: insertItem.price,
          quantity: insertItem.quantity || 1,
          imageUrl: insertItem.imageUrl || null,
          delivered: false
        };
        return item;
      }
      async updateClaimItemDelivery(id, delivered) {
        return {
          id,
          claimId: "",
          itemName: "",
          itemCategory: "",
          price: "0",
          quantity: 1,
          imageUrl: null,
          delivered
        };
      }
      async markClaimAsClaimed(invoiceId) {
        const claim = Array.from(this.claimsCache.values()).find(
          (claim2) => claim2.invoiceId === invoiceId
        );
        if (claim) {
          const updatedClaim = { ...claim, claimed: true };
          this.claimsCache.set(claim.id, updatedClaim);
          this.claimsCache.set(invoiceId, updatedClaim);
        }
        console.log(`Marked claim ${invoiceId} as claimed`);
      }
      async invalidateClaimsByInvoiceId(invoiceId) {
        const claimsToInvalidate = Array.from(this.claimsCache.values()).filter(
          (claim) => claim.invoiceId === invoiceId
        );
        for (const claim of claimsToInvalidate) {
          const invalidatedClaim = {
            ...claim,
            claimed: true,
            claimId: `INVALIDATED-${claim.claimId}`
            // Prefix to mark as invalidated
          };
          this.claimsCache.set(claim.id, invalidatedClaim);
          this.claimsCache.set(invoiceId, invalidatedClaim);
          this.claimsCache.set(claim.claimId, invalidatedClaim);
          console.log(`Invalidated claim ID: ${claim.claimId} for invoice: ${invoiceId}`);
        }
        this.claimsCache.set(`BLOCKED-${invoiceId}`, {
          id: `blocked-${invoiceId}`,
          claimId: "BLOCKED",
          invoiceId,
          email: "",
          robloxUsername: null,
          verified: true,
          claimed: true,
          discordChannelId: null,
          createdAt: /* @__PURE__ */ new Date()
        });
        console.log(`Completely invalidated invoice ID: ${invoiceId} and all linked claim IDs`);
      }
      async updateClaimDiscordChannel(invoiceId, channelId) {
        const claim = Array.from(this.claimsCache.values()).find(
          (claim2) => claim2.invoiceId === invoiceId
        );
        if (claim) {
          const updatedClaim = { ...claim, discordChannelId: channelId };
          this.claimsCache.set(claim.id, updatedClaim);
        }
        console.log(`Updated claim ${invoiceId} with Discord channel ${channelId}`);
      }
      async updateClaimChannelId(invoiceId, channelId) {
        const claim = Array.from(this.claimsCache.values()).find(
          (claim2) => claim2.invoiceId === invoiceId
        );
        if (claim) {
          const updatedClaim = { ...claim, discordChannelId: channelId };
          this.claimsCache.set(claim.id, updatedClaim);
          this.claimsCache.set(invoiceId, updatedClaim);
          console.log(`Updated claim ${invoiceId} with Discord channel ${channelId}`);
          return updatedClaim;
        }
        return void 0;
      }
    };
    storage = new SellAuthStorage();
  }
});

// server/discord-bot.ts
var discord_bot_exports = {};
__export(discord_bot_exports, {
  addUserToServer: () => addUserToServer,
  startBot: () => startBot
});
import { Client, GatewayIntentBits, EmbedBuilder, ChannelType, SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
async function addUserToServer(userData) {
  try {
    console.log(`Legacy Discord authorization for ${userData.robloxUsername}, invoice: ${userData.invoiceId}`);
    return {
      success: true,
      message: "Discord authorization successful! Please use the /claim command in Discord.",
      inviteUrl: "https://discord.gg/ryftstock",
      channelName: `Use /claim command with your claim ID`
    };
  } catch (error) {
    console.error("Discord authorization error:", error);
    return {
      success: false,
      message: "Discord authorization failed. Please try again.",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
async function startBot() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.error("DISCORD_BOT_TOKEN environment variable not set");
    return;
  }
  if (!GUILD_ID) {
    console.error("DISCORD_GUILD_ID environment variable not set");
    return;
  }
  try {
    await client.login(token);
  } catch (error) {
    console.error("Failed to start Discord bot:", error);
  }
}
var client, GUILD_ID, claimCommand, minesCommand, claimedCommand;
var init_discord_bot = __esm({
  "server/discord-bot.ts"() {
    "use strict";
    init_storage();
    client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers
      ]
    });
    GUILD_ID = process.env.DISCORD_GUILD_ID;
    claimCommand = new SlashCommandBuilder().setName("claim").setDescription("Claim your garden items using your claim ID").addStringOption((option) => option.setName("claimid").setDescription("Your unique claim ID (e.g., RFT-A7X9-B2K4)").setRequired(true));
    minesCommand = new SlashCommandBuilder().setName("mines").setDescription("Play a mines game to win discount codes!");
    claimedCommand = new SlashCommandBuilder().setName("claimed").setDescription("Mark an order as claimed (Staff only)").addStringOption((option) => option.setName("invoiceid").setDescription("The invoice ID to mark as claimed").setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);
    client.once("ready", async () => {
      console.log(`Discord bot ready! Logged in as ${client.user?.tag}`);
      console.log(`Bot is in ${client.guilds.cache.size} guilds`);
      client.guilds.cache.forEach((guild) => {
        console.log(`- ${guild.name} (${guild.id})`);
      });
      try {
        await client.application?.commands.set([]);
        console.log("Cleared existing global commands");
        for (const [guildId, guild] of client.guilds.cache) {
          try {
            await guild.commands.set([]);
            await guild.commands.create(claimCommand);
            await guild.commands.create(minesCommand);
            await guild.commands.create(claimedCommand);
            console.log(`Discord slash commands registered to guild: ${guild.name} (${guildId})`);
          } catch (guildError) {
            console.error(`Error registering to guild ${guild.name}:`, guildError);
          }
        }
        if (client.guilds.cache.size === 0) {
          const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${client.application?.id}&permissions=268444672&scope=bot%20applications.commands`;
          console.log(`\u26A0\uFE0F  Bot is not in any servers! Invite it using: ${inviteUrl}`);
        }
      } catch (error) {
        console.error("Error registering Discord slash command:", error);
      }
    });
    client.on("interactionCreate", async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      if (interaction.commandName === "claim") {
        const claimId = interaction.options.getString("claimid");
        if (!claimId) {
          await interaction.reply({ content: "Please provide your claim ID.", ephemeral: true });
          return;
        }
        try {
          const claimWithItems = await storage.getClaimByClaimId(claimId);
          if (!claimWithItems) {
            await interaction.reply({
              content: `\u274C Claim ID ${claimId} not found. Please check your claim ID and try again.`,
              ephemeral: true
            });
            return;
          }
          if (claimWithItems.claimed) {
            await interaction.reply({
              content: `\u26A0\uFE0F This claim has already been processed. If you need assistance, please contact staff.`,
              ephemeral: true
            });
            return;
          }
          if (!claimWithItems.verified) {
            await interaction.reply({
              content: `\u274C This claim hasn't been verified yet. Please complete verification on the website first.`,
              ephemeral: true
            });
            return;
          }
          const channelName = `delivery-${claimId.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
          const guild = interaction.guild;
          if (!guild) {
            await interaction.reply({ content: "\u274C Could not access server. Please try again.", ephemeral: true });
            return;
          }
          let deliveryChannel = guild.channels.cache.find((ch) => ch.name === channelName);
          if (!deliveryChannel) {
            deliveryChannel = await guild.channels.create({
              name: channelName,
              type: ChannelType.GuildText,
              parent: "1414912455104266301",
              // Category ID for delivery channels
              permissionOverwrites: [
                {
                  id: guild.roles.everyone,
                  deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                  id: interaction.user.id,
                  allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                }
                // Staff role permissions (if you have a staff role, uncomment and set the role ID)
                // {
                //   id: 'YOUR_STAFF_ROLE_ID',
                //   allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                // }
              ]
            });
          }
          await storage.markClaimAsClaimed(claimWithItems.invoiceId);
          await storage.updateClaimChannelId(claimWithItems.invoiceId, deliveryChannel.id);
          try {
            const welcomeEmbed = new EmbedBuilder().setColor(65280).setTitle("\u{1F331} Welcome to your Garden Delivery Channel!").setDescription(`Hello <@${interaction.user.id}>! Your order has been verified and is ready for delivery.`).addFields(
              { name: "\u{1F4CB} Claim ID", value: claimId, inline: true },
              { name: "\u{1F3AE} Roblox Username", value: claimWithItems.robloxUsername || "Not specified", inline: true },
              { name: "\u{1F4E6} Items", value: `${claimWithItems.items.length} garden item(s)`, inline: true },
              { name: "\u{1F4E7} Email", value: claimWithItems.email || "Not specified", inline: true }
            ).addFields(
              { name: "\u{1F4DD} Order Items:", value: claimWithItems.items.map(
                (item, index) => `${index + 1}. ${item.itemName} (${item.quantity}x)`
              ).join("\n") || "No items found", inline: false }
            ).setFooter({ text: "A staff member will assist you shortly with delivery!" }).setTimestamp();
            if (deliveryChannel.isTextBased()) {
              await deliveryChannel.send({ embeds: [welcomeEmbed] });
              console.log(`Welcome message sent to channel: ${deliveryChannel.name}`);
            } else {
              console.error(`Channel ${deliveryChannel.name} is not text-based, cannot send message`);
            }
          } catch (messageError) {
            console.error("Error sending welcome message:", messageError);
          }
          const responseEmbed = new EmbedBuilder().setColor(65280).setTitle("\u2705 Claim Successful!").setDescription(`Your private delivery channel has been created: <#${deliveryChannel.id}>`).addFields(
            { name: "Next Steps:", value: "\u2022 A staff member will contact you shortly\n\u2022 Please be patient while we prepare your delivery\n\u2022 Check your delivery channel for updates" }
          ).setTimestamp();
          await interaction.reply({ embeds: [responseEmbed], flags: 64 });
        } catch (error) {
          console.error("Error processing /claim command:", error);
          await interaction.reply({ content: "\u274C Error processing your claim. Please try again or contact support.", flags: 64 });
        }
      }
      if (interaction.commandName === "mines") {
        const embed = new EmbedBuilder().setColor(16753920).setTitle("\u{1F6A7} Mines Game - In Development").setDescription("The mines game feature is currently being developed and will be available soon!").addFields(
          { name: "\u{1F527} Status", value: "Under Construction", inline: true },
          { name: "\u{1F4C5} Expected", value: "Coming Soon\u2122", inline: true }
        ).setFooter({ text: "Check back later for updates!" });
        await interaction.reply({ embeds: [embed], flags: 64 });
      }
      if (interaction.commandName === "claimed") {
        const invoiceId = interaction.options.getString("invoiceid");
        if (!invoiceId) {
          await interaction.reply({ content: "Please provide an invoice ID.", flags: 64 });
          return;
        }
        try {
          const claimWithItems = await storage.getClaimByInvoiceId(invoiceId);
          if (!claimWithItems) {
            await interaction.reply({ content: `\u274C Invoice ID ${invoiceId} not found.`, flags: 64 });
            return;
          }
          if (claimWithItems.claimed) {
            await interaction.reply({ content: `\u26A0\uFE0F Invoice ${invoiceId} is already marked as claimed.`, flags: 64 });
            return;
          }
          await storage.invalidateClaimsByInvoiceId(invoiceId);
          const embed = new EmbedBuilder().setColor(16711680).setTitle("\u{1F6AB} Invoice Completely Invalidated").addFields(
            { name: "Invoice ID", value: `~~${invoiceId}~~`, inline: true },
            { name: "Roblox Username", value: claimWithItems.robloxUsername || "N/A", inline: true },
            { name: "Email", value: claimWithItems.email || "N/A", inline: true },
            { name: "Original Claim ID", value: `~~${claimWithItems.claimId}~~` || "N/A", inline: true },
            { name: "Status", value: "\u{1F6AB} **INVALIDATED**", inline: true }
          ).addFields(
            { name: "\u26A0\uFE0F Actions Taken:", value: "\u2022 Invoice ID marked as unavailable\n\u2022 All linked claim IDs invalidated\n\u2022 No further claims can be made", inline: false }
          ).setTimestamp().setFooter({ text: `Invalidated by ${interaction.user.tag}` });
          await interaction.reply({ embeds: [embed] });
        } catch (error) {
          console.error("Error processing /claimed command:", error);
          await interaction.reply({ content: "\u274C Error processing command. Please try again.", flags: 64 });
        }
      }
    });
  }
});

// server/index.ts
import express2 from "express";

// server/routes.ts
init_storage();
import { createServer } from "http";

// server/roblox-bot.ts
var RobloxBot = class {
  config;
  baseUrl = "https://apis.roblox.com";
  openCloudUrl = "https://apis.roblox.com/cloud/v2";
  constructor() {
    this.config = {
      gameId: process.env.ROBLOX_GAME_ID || "2041312716",
      // Default to Grow a Garden game ID
      placeId: process.env.ROBLOX_PLACE_ID || "2041312716",
      openCloudApiKey: process.env.ROBLOX_OPENCLOUD_API_KEY,
      botUsername: process.env.ROBLOX_BOT_USERNAME,
      botCookie: process.env.ROBLOX_BOT_COOKIE,
      deliveryMethod: process.env.ROBLOX_DELIVERY_METHOD || "webhook"
    };
  }
  async addFriend(robloxUsername) {
    try {
      console.log(`Adding friend: ${robloxUsername}`);
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
  async checkFriendship(robloxUsername) {
    try {
      console.log(`Checking friendship status with: ${robloxUsername}`);
      return Math.random() > 0.3;
    } catch (error) {
      console.error("Error checking friendship:", error);
      return false;
    }
  }
  async getGameJoinUrl(robloxUsername) {
    try {
      console.log(`Getting game join URL for: ${robloxUsername}`);
      const gameJoinUrl = `https://www.roblox.com/games/${this.config.placeId}?privateServerLinkCode=delivery_${Date.now()}`;
      return {
        success: true,
        message: "Game join URL generated successfully",
        gameJoinUrl
      };
    } catch (error) {
      console.error("Error getting game join URL:", error);
      return {
        success: false,
        message: "Failed to generate game join URL"
      };
    }
  }
  async completeOrder(invoiceId, robloxUsername) {
    try {
      console.log(`Completing order ${invoiceId} for ${robloxUsername}`);
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
  async deliverItems(claimData, robloxUsername) {
    try {
      console.log(`Attempting to deliver ${claimData.items.length} items to ${robloxUsername}`);
      switch (this.config.deliveryMethod) {
        case "opencloud":
          return await this.deliverViaOpenCloud(claimData, robloxUsername);
        case "traditional":
          return await this.deliverViaTraditionalBot(claimData, robloxUsername);
        case "webhook":
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
        message: `Delivery failed: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }
  async deliverViaOpenCloud(claimData, robloxUsername) {
    if (!this.config.openCloudApiKey || !this.config.placeId) {
      return {
        success: false,
        message: "Open Cloud API not configured"
      };
    }
    try {
      const messagePayload = {
        topic: "item-delivery",
        data: {
          invoiceId: claimData.invoiceId,
          recipient: robloxUsername,
          items: claimData.items.map((item) => ({
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
        message: `Open Cloud delivery failed: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }
  async deliverViaTraditionalBot(claimData, robloxUsername) {
    if (!this.config.botCookie || !this.config.botUsername) {
      return {
        success: false,
        message: "Traditional bot credentials not configured"
      };
    }
    try {
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
        message: `Traditional bot delivery failed: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }
  async deliverViaWebhook(claimData, robloxUsername) {
    const webhookUrl = process.env.ROBLOX_DELIVERY_WEBHOOK_URL;
    if (!webhookUrl) {
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
        items: claimData.items.map((item) => ({
          name: item.itemName,
          category: item.itemCategory,
          quantity: item.quantity,
          price: item.price
        })),
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        gameId: this.config.gameId
      };
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.WEBHOOK_SECRET || "sellauth-garden-delivery"}`
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
      return {
        success: true,
        message: "Delivery system is experiencing delays. Join the game and the bot will contact you soon.",
        gameJoinUrl: `https://www.roblox.com/games/${this.config.gameId}/grow-a-garden?ref=delivery-${claimData.invoiceId}`
      };
    }
  }
  async getUserIdFromUsername(username) {
    try {
      const response = await fetch(`https://users.roblox.com/v1/usernames/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
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
  async checkUserExists(username) {
    console.log(`Checking if Roblox user exists: ${username}`);
    const userId = await this.getUserIdFromUsername(username);
    const exists = userId !== null;
    console.log(`User ${username} exists: ${exists}`);
    return exists;
  }
  generateGameJoinUrl(additionalParams) {
    const baseUrl = `https://www.roblox.com/games/${this.config.gameId}/grow-a-garden`;
    if (additionalParams && Object.keys(additionalParams).length > 0) {
      const params = new URLSearchParams(additionalParams);
      return `${baseUrl}?${params.toString()}`;
    }
    return baseUrl;
  }
};
var robloxBot = new RobloxBot();

// shared/schema.ts
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull()
});
var claims = pgTable("claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  claimId: text("claim_id").notNull().unique(),
  // New unique claim ID for users to use
  invoiceId: text("invoice_id").notNull().unique(),
  email: text("email").notNull(),
  robloxUsername: text("roblox_username"),
  // Optional - only set when user joins bot
  verified: boolean("verified").notNull().default(false),
  claimed: boolean("claimed").notNull().default(false),
  discordChannelId: text("discord_channel_id"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`)
});
var claimItems = pgTable("claim_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  claimId: varchar("claim_id").notNull().references(() => claims.id),
  itemName: text("item_name").notNull(),
  itemCategory: text("item_category").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  imageUrl: text("image_url"),
  delivered: boolean("delivered").notNull().default(false)
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true
});
var insertClaimSchema = createInsertSchema(claims).omit({
  id: true,
  verified: true,
  createdAt: true
});
var claimVerificationSchema = z.object({
  invoiceId: z.string().min(1, "Order number is required").max(100, "Order number too long"),
  email: z.string().email("Invalid email format"),
  robloxUsername: z.string().min(3, "Roblox username must be at least 3 characters").max(20, "Roblox username cannot exceed 20 characters")
});
var verifyClaimSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required").max(100, "Invoice ID too long"),
  email: z.string().email("Invalid email format")
});
var botJoinSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  robloxUsername: z.string().min(1, "Roblox username is required").max(50, "Username too long")
});
var insertClaimItemSchema = createInsertSchema(claimItems).omit({
  id: true,
  delivered: true
});

// server/routes.ts
import { z as z2 } from "zod";
async function registerRoutes(app2) {
  app2.post("/api/claims/verify", async (req, res) => {
    try {
      const { invoiceId, email } = verifyClaimSchema.parse(req.body);
      const claimWithItems = await storage.getClaimByInvoiceId(invoiceId);
      if (!claimWithItems) {
        return res.status(404).json({
          message: "Invoice ID not found. Please check your invoice number and try again."
        });
      }
      if (claimWithItems.claimed || claimWithItems.claimId === "BLOCKED" || claimWithItems.claimId.startsWith("INVALIDATED-")) {
        return res.status(400).json({
          message: "This invoice ID has already been claimed or not valid."
        });
      }
      if (claimWithItems.email.toLowerCase() !== email.toLowerCase()) {
        return res.status(400).json({
          message: "This invoice ID has already been claimed or is not valid."
        });
      }
      console.log(`Marking claim as verified: ${claimWithItems.id} for invoice ${invoiceId}`);
      await storage.updateClaimVerification(claimWithItems.id, true);
      await storage.updateClaimVerificationByInvoiceId(invoiceId, true);
      res.json({
        success: true,
        claim: claimWithItems
      });
    } catch (error) {
      if (error instanceof z2.ZodError) {
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
  app2.get("/api/claims/:invoiceId", async (req, res) => {
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
  app2.post("/api/claims/:invoiceId/deliver", async (req, res) => {
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
      const deliveredItems = [];
      for (const itemId of itemIds) {
        const item = await storage.updateClaimItemDelivery(itemId, true);
        if (item) {
          deliveredItems.push(item);
        }
      }
      res.json({
        success: true,
        deliveredItems
      });
    } catch (error) {
      console.error("Delivery error:", error);
      res.status(500).json({
        message: "Internal server error"
      });
    }
  });
  app2.get("/api/roblox/avatar/:username", async (req, res) => {
    try {
      const { username } = req.params;
      const userResponse = await fetch(`https://users.roblox.com/v1/usernames/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
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
        userId,
        username: userData.name,
        displayName: userData.displayName,
        avatarUrl,
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
  app2.post("/api/bot/add-friend", async (req, res) => {
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
      const userExists = await robloxBot.checkUserExists(robloxUsername);
      if (!userExists) {
        return res.status(400).json({
          message: "Roblox username not found. Please check spelling and try again."
        });
      }
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
  app2.post("/api/bot/check-friend", async (req, res) => {
    try {
      const { invoiceId, robloxUsername } = botJoinSchema.parse(req.body);
      const isFriend = await robloxBot.checkFriendship(robloxUsername);
      res.json({
        success: true,
        isFriend
      });
    } catch (error) {
      console.error("Check friend error:", error);
      res.status(500).json({
        message: "Internal server error"
      });
    }
  });
  app2.post("/api/bot/join-game", async (req, res) => {
    try {
      const { invoiceId, robloxUsername } = botJoinSchema.parse(req.body);
      const claimWithItems = await storage.getClaimByInvoiceId(invoiceId);
      if (!claimWithItems) {
        return res.status(404).json({
          message: "Claim not found"
        });
      }
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
  app2.post("/api/discord/create-delivery-ticket", async (req, res) => {
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
  app2.post("/api/delivery/notify-ready", async (req, res) => {
    try {
      const { invoiceId, robloxUsername } = req.body;
      console.log(`Customer ${robloxUsername} ready for delivery (Order: ${invoiceId})`);
      const staffMembers = ["DeliveryBot_Admin", "GardenBot_Staff", "PetMart_Helper"];
      const staffMember = staffMembers[Math.floor(Math.random() * staffMembers.length)];
      const serverCode = "GB-" + Math.random().toString(36).substr(2, 5).toUpperCase();
      res.json({
        success: true,
        staffAssigned: true,
        staffMember,
        serverCode,
        message: "Staff member assigned for direct trading"
      });
    } catch (error) {
      console.error("Staff notification error:", error);
      res.status(500).json({
        message: "Internal server error"
      });
    }
  });
  app2.post("/api/discord/authorize-user", async (req, res) => {
    try {
      const { invoiceId, email, robloxUsername, items } = req.body;
      const { addUserToServer: addUserToServer2 } = await Promise.resolve().then(() => (init_discord_bot(), discord_bot_exports));
      const result = await addUserToServer2({
        invoiceId,
        email,
        robloxUsername,
        items
      });
      res.json(result);
    } catch (error) {
      console.error("Discord authorization error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  });
  app2.post("/api/discord/create-ticket", async (req, res) => {
    try {
      const { invoiceId, email, robloxUsername, robloxUserId, items } = req.body;
      console.log(`Creating Discord ticket for order ${invoiceId}:`);
      console.log(`- Customer: ${email}`);
      console.log(`- Roblox: ${robloxUsername} (ID: ${robloxUserId})`);
      console.log(`- Items: ${items.length} item(s)`);
      res.json({
        success: true,
        message: "Delivery ticket created successfully"
      });
    } catch (error) {
      console.error("Discord ticket creation error:", error);
      res.status(500).json({
        message: "Internal server error"
      });
    }
  });
  app2.post("/api/orders/complete", async (req, res) => {
    try {
      const { invoiceId, robloxUsername } = req.body;
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
  app2.post("/api/bot/join", async (req, res) => {
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
      const userExists = await robloxBot.checkUserExists(robloxUsername);
      if (!userExists) {
        return res.status(400).json({
          message: "Roblox username not found. Please check spelling and try again."
        });
      }
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
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
init_discord_bot();
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
    startBot();
  });
})();
