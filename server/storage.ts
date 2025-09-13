import { type User, type InsertUser, type Claim, type InsertClaim, type ClaimItem, type InsertClaimItem, type ClaimWithItems } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getClaim(invoiceId: string): Promise<Claim | undefined>;
  getClaimByInvoiceId(invoiceId: string): Promise<ClaimWithItems | undefined>;
  getClaimByClaimId(claimId: string): Promise<ClaimWithItems | undefined>;
  createClaim(claim: InsertClaim): Promise<Claim>;
  updateClaimVerification(id: string, verified: boolean): Promise<Claim | undefined>;
  updateClaimVerificationByInvoiceId(invoiceId: string, verified: boolean): Promise<void>;
  markClaimAsClaimed(invoiceId: string): Promise<void>;
  invalidateClaimsByInvoiceId(invoiceId: string): Promise<void>;
  updateClaimDiscordChannel(invoiceId: string, channelId: string): Promise<void>;
  updateClaimChannelId(invoiceId: string, channelId: string): Promise<Claim | undefined>;
  
  getClaimItems(claimId: string): Promise<ClaimItem[]>;
  createClaimItem(item: InsertClaimItem): Promise<ClaimItem>;
  updateClaimItemDelivery(id: string, delivered: boolean): Promise<ClaimItem | undefined>;
}

class SellAuthAPI {
  private apiKey: string;
  private shopId: string;
  private baseUrl = "https://api.sellauth.com/v1";

  constructor() {
    this.apiKey = process.env.SELLAUTH_API_KEY || "";
    this.shopId = process.env.SELLAUTH_SHOP_ID || "";
    
    if (!this.apiKey || !this.shopId) {
      console.warn("SellAuth credentials not found. Using fallback mode.");
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    if (!this.apiKey || !this.shopId) {
      throw new Error("SellAuth API credentials not configured");
    }

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`SellAuth API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getInvoiceById(invoiceId: string) {
    try {
      return await this.makeRequest(`/shops/${this.shopId}/invoices/${invoiceId}`);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      return null;
    }
  }

  async searchInvoices(filters: any) {
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
}

export class SellAuthStorage implements IStorage {
  private users: Map<string, User>;
  private claimsCache: Map<string, Claim>;
  private claimItemsCache: Map<string, ClaimItem>;
  private sellAuthAPI: SellAuthAPI;

  constructor() {
    this.users = new Map();
    this.claimsCache = new Map();
    this.claimItemsCache = new Map();
    this.sellAuthAPI = new SellAuthAPI();
  }

  private generateClaimId(invoiceId?: string): string {
    if (invoiceId && invoiceId.length >= 4) {
      // Extract first 2 and last 2 characters from invoice ID
      const first2 = invoiceId.substring(0, 2).toUpperCase();
      const last2 = invoiceId.substring(invoiceId.length - 2).toUpperCase();
      return `RYFT-${first2}${last2}`;
    }
    // Fallback for shorter invoice IDs
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const randomPart = Array.from({length: 4}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `RYFT-${randomPart}`;
  }

  private convertSellAuthInvoiceToClaimWithItems(invoice: any, originalInvoiceId?: string): ClaimWithItems | undefined {
    if (!invoice) return undefined;

    try {
      const claim: Claim = {
        id: randomUUID(),
        claimId: this.generateClaimId(originalInvoiceId || invoice.id?.toString()), // Generate unique claim ID
        invoiceId: originalInvoiceId || invoice.id?.toString() || "", // Use original full invoice ID if provided
        email: invoice.email || "",
        robloxUsername: invoice.custom_field || "", // Assuming custom field contains Roblox username
        verified: false,
        claimed: false,
        discordChannelId: null,
        createdAt: new Date(invoice.created_at || Date.now()),
      };

      // Convert invoice items to claim items
      const items: ClaimItem[] = (invoice.items || []).map((invoiceItem: any) => ({
        id: randomUUID(),
        claimId: claim.id,
        itemName: invoiceItem.product?.name || invoiceItem.variant?.name || "Unknown Item",
        itemCategory: invoiceItem.product?.category || "Garden Item",
        price: invoiceItem.price_usd?.toString() || "0.00",
        quantity: invoiceItem.quantity || 1,
        imageUrl: invoiceItem.product?.images?.[0]?.url || null,
        delivered: invoiceItem.delivered || false,
      }));

      return { ...claim, items };
    } catch (error) {
      console.error("Error converting SellAuth invoice:", error);
      return undefined;
    }
  }

  async getClaimByClaimId(claimId: string): Promise<ClaimWithItems | undefined> {
    console.log(`Fetching claim with claim ID: ${claimId}`);
    
    // Search cache for claim with matching claimId
    const cachedClaim = Array.from(this.claimsCache.values()).find(
      claim => claim.claimId === claimId || claim.claimId === `INVALIDATED-${claimId}`
    );
    
    if (cachedClaim) {
      console.log(`Found cached claim for claim ID: ${claimId}`);
      
      // Check if this claim was invalidated
      if (cachedClaim.claimId.startsWith('INVALIDATED-') || cachedClaim.claimed) {
        console.log(`Claim ID ${claimId} has been invalidated or already claimed`);
        const items: ClaimItem[] = [];
        return { ...cachedClaim, items };
      }
      
      // Get the full claim with items
      const items = Array.from(this.claimItemsCache.values()).filter(
        (item: ClaimItem) => item.claimId === cachedClaim.id
      );
      return { ...cachedClaim, items };
    }

    // If not in cache, this means the claim hasn't been verified yet
    // or the claim ID is invalid
    console.log(`No claim found for claim ID: ${claimId}`);
    return undefined;
  }

  // Fallback sample data for testing
  private getFallbackSampleData(): ClaimWithItems {
    const sampleClaim: Claim = {
      id: randomUUID(),
      claimId: this.generateClaimId("test123abc"),
      invoiceId: "test123abc",
      email: "player@example.com",
      robloxUsername: "TestPlayer123",
      verified: false,
      claimed: false,
      discordChannelId: null,
      createdAt: new Date(),
    };
    
    const sampleItems: ClaimItem[] = [
      {
        id: randomUUID(),
        claimId: sampleClaim.id,
        itemName: "Rainbow Dragon Pet",
        itemCategory: "Legendary • Grow a Garden",
        price: "25.99",
        quantity: 1,
        imageUrl: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=120&h=120",
        delivered: false,
      },
      {
        id: randomUUID(),
        claimId: sampleClaim.id,
        itemName: "Mystical Garden Pack",
        itemCategory: "Epic • Plant Collection",
        price: "12.99",
        quantity: 3,
        imageUrl: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?ixlib=rb-4.0.3&auto=format&fit=crop&w=120&h=120",
        delivered: false,
      }
    ];
    
    return { ...sampleClaim, items: sampleItems };
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getClaim(invoiceId: string): Promise<Claim | undefined> {
    // Find claim by invoiceId
    return Array.from(this.claimsCache.values()).find(
      (claim) => claim.invoiceId === invoiceId
    );
  }

  async getClaimByInvoiceId(invoiceId: string): Promise<ClaimWithItems | undefined> {
    try {
      // Check if this invoice has been blocked/invalidated
      const blockedClaim = this.claimsCache.get(`BLOCKED-${invoiceId}`);
      if (blockedClaim) {
        console.log(`Invoice ${invoiceId} has been invalidated by staff`);
        const items: ClaimItem[] = [];
        return { ...blockedClaim, items };
      }

      // First check cache
      const cachedClaim = Array.from(this.claimsCache.values()).find(
        (claim) => claim.invoiceId === invoiceId && !claim.id.startsWith('blocked-')
      );
      
      if (cachedClaim) {
        console.log(`Found claim in cache for invoice: ${invoiceId}, verified: ${cachedClaim.verified}`);
        
        // If claim was invalidated, return it as claimed
        if (cachedClaim.claimed && cachedClaim.claimId.startsWith('INVALIDATED-')) {
          console.log(`Claim for invoice ${invoiceId} was invalidated by staff`);
          const items: ClaimItem[] = [];
          return { ...cachedClaim, items };
        }
        
        // Get the full claim with items from SellAuth but preserve cached verification status
        const invoice = await this.sellAuthAPI.getInvoiceById(invoiceId);
        if (invoice) {
          const claimWithItems = this.convertSellAuthInvoiceToClaimWithItems(invoice, invoiceId); // Pass original invoice ID
          if (claimWithItems) {
            // Override with cached verification status
            claimWithItems.id = cachedClaim.id; // Keep the same ID
            claimWithItems.verified = cachedClaim.verified;
            claimWithItems.claimed = cachedClaim.claimed;
            claimWithItems.discordChannelId = cachedClaim.discordChannelId;
            console.log(`Using cached verification status for ${invoiceId}: verified=${claimWithItems.verified}`);
            return claimWithItems;
          }
        }
        // Fallback - return cached claim with empty items if API fails
        const items: ClaimItem[] = [];
        return { ...cachedClaim, items };
      }

      // Try to fetch from SellAuth API
      console.log("Fetching invoice from SellAuth API:", invoiceId);
      const invoice = await this.sellAuthAPI.getInvoiceById(invoiceId);
      
      if (invoice) {
        console.log("Found invoice in SellAuth:", invoice.id);
        
        // Check if we already have a cached claim for this exact invoice (anti-cheat)
        const existingClaim = Array.from(this.claimsCache.values()).find(
          (claim) => claim.invoiceId === invoiceId && claim.id !== `blocked-${invoiceId}`
        );
        
        if (existingClaim) {
          console.log("Anti-cheat: Returning existing claim for invoice:", invoiceId);
          // Return the existing claim to prevent duplicate claim generation
          const items = Array.from(this.claimItemsCache.values()).filter(
            (item: ClaimItem) => item.claimId === existingClaim.id
          );
          return { ...existingClaim, items };
        }
        
        const claimWithItems = this.convertSellAuthInvoiceToClaimWithItems(invoice, invoiceId); // Pass original invoice ID
        if (claimWithItems) {
          // Cache the claim for future reference
          this.claimsCache.set(claimWithItems.id, claimWithItems);
          this.claimsCache.set(invoiceId, claimWithItems);
        }
        return claimWithItems;
      }

      // Fallback to sample data for demonstration
      console.log("Using fallback sample data for invoice:", invoiceId);
      const fallbackData = this.getFallbackSampleData();
      // Override the fallback data's invoiceId with the original one
      fallbackData.invoiceId = invoiceId;
      return fallbackData;
    } catch (error) {
      console.error("Error in getClaimByInvoiceId:", error);
      
      // Fallback to sample data on error
      const fallbackData = this.getFallbackSampleData();
      // Override the fallback data's invoiceId with the original one
      fallbackData.invoiceId = invoiceId;
      return fallbackData;
    }
  }

  async createClaim(insertClaim: InsertClaim): Promise<Claim> {
    const id = randomUUID();
    const claim: Claim = {
      id,
      claimId: this.generateClaimId(insertClaim.invoiceId),
      invoiceId: insertClaim.invoiceId,
      email: insertClaim.email,
      robloxUsername: null,
      verified: false,
      claimed: false,
      discordChannelId: null,
      createdAt: new Date(),
    };
    this.claimsCache.set(id, claim);
    return claim;
  }

  async updateClaimVerification(id: string, verified: boolean): Promise<Claim | undefined> {
    // Find the claim either in cache or by looking up all cached claims
    let claim = this.claimsCache.get(id);
    
    if (!claim) {
      // If not found by ID, search by any cached claim with matching ID
      for (const cachedClaim of Array.from(this.claimsCache.values())) {
        if (cachedClaim.id === id) {
          claim = cachedClaim;
          break;
        }
      }
    }
    
    if (!claim) return undefined;
    
    const updatedClaim = { ...claim, verified };
    this.claimsCache.set(claim.invoiceId, updatedClaim); // Store by invoiceId for easier lookup
    this.claimsCache.set(id, updatedClaim); // Also store by ID
    console.log(`Updated claim verification: ${claim.invoiceId} -> verified: ${verified}`);
    return updatedClaim;
  }

  async updateClaimVerificationByInvoiceId(invoiceId: string, verified: boolean): Promise<void> {
    // Find and update claim verification by invoice ID
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

  async getClaimItems(claimId: string): Promise<ClaimItem[]> {
    // Items are now included in ClaimWithItems, so this would fetch from cache or API
    return [];
  }

  async createClaimItem(insertItem: InsertClaimItem): Promise<ClaimItem> {
    const id = randomUUID();
    const item: ClaimItem = {
      id,
      claimId: insertItem.claimId,
      itemName: insertItem.itemName,
      itemCategory: insertItem.itemCategory,
      price: insertItem.price,
      quantity: insertItem.quantity || 1,
      imageUrl: insertItem.imageUrl || null,
      delivered: false,
    };
    return item;
  }

  async updateClaimItemDelivery(id: string, delivered: boolean): Promise<ClaimItem | undefined> {
    // In a real implementation, this would update the delivery status in SellAuth or cache
    return {
      id,
      claimId: "",
      itemName: "",
      itemCategory: "",
      price: "0",
      quantity: 1,
      imageUrl: null,
      delivered,
    };
  }

  async markClaimAsClaimed(invoiceId: string): Promise<void> {
    // Find and mark claim as claimed
    const claim = Array.from(this.claimsCache.values()).find(
      (claim) => claim.invoiceId === invoiceId
    );
    
    if (claim) {
      const updatedClaim = { ...claim, claimed: true };
      this.claimsCache.set(claim.id, updatedClaim);
      this.claimsCache.set(invoiceId, updatedClaim);
    }
    
    console.log(`Marked claim ${invoiceId} as claimed`);
  }

  async invalidateClaimsByInvoiceId(invoiceId: string): Promise<void> {
    // Find all claims with this invoice ID and mark them as claimed (unavailable)
    const claimsToInvalidate = Array.from(this.claimsCache.values()).filter(
      (claim) => claim.invoiceId === invoiceId
    );
    
    for (const claim of claimsToInvalidate) {
      // Mark as claimed and set a special flag to indicate it was invalidated by staff
      const invalidatedClaim = { 
        ...claim, 
        claimed: true,
        claimId: `INVALIDATED-${claim.claimId}` // Prefix to mark as invalidated
      };
      
      // Update all possible cache entries
      this.claimsCache.set(claim.id, invalidatedClaim);
      this.claimsCache.set(invoiceId, invalidatedClaim);
      this.claimsCache.set(claim.claimId, invalidatedClaim); // Cache by original claim ID too
      
      console.log(`Invalidated claim ID: ${claim.claimId} for invoice: ${invoiceId}`);
    }
    
    // Also add an entry to prevent future generation of claims for this invoice
    this.claimsCache.set(`BLOCKED-${invoiceId}`, {
      id: `blocked-${invoiceId}`,
      claimId: 'BLOCKED',
      invoiceId,
      email: '',
      robloxUsername: null,
      verified: true,
      claimed: true,
      discordChannelId: null,
      createdAt: new Date()
    });
    
    console.log(`Completely invalidated invoice ID: ${invoiceId} and all linked claim IDs`);
  }

  async updateClaimDiscordChannel(invoiceId: string, channelId: string): Promise<void> {
    // Find and update claim with Discord channel ID
    const claim = Array.from(this.claimsCache.values()).find(
      (claim) => claim.invoiceId === invoiceId
    );
    
    if (claim) {
      const updatedClaim = { ...claim, discordChannelId: channelId };
      this.claimsCache.set(claim.id, updatedClaim);
    }
    
    console.log(`Updated claim ${invoiceId} with Discord channel ${channelId}`);
  }

  async updateClaimChannelId(invoiceId: string, channelId: string): Promise<Claim | undefined> {
    // Find and update claim with Discord channel ID
    const claim = Array.from(this.claimsCache.values()).find(
      (claim) => claim.invoiceId === invoiceId
    );
    
    if (claim) {
      const updatedClaim = { ...claim, discordChannelId: channelId };
      this.claimsCache.set(claim.id, updatedClaim);
      this.claimsCache.set(invoiceId, updatedClaim);
      console.log(`Updated claim ${invoiceId} with Discord channel ${channelId}`);
      return updatedClaim;
    }
    
    return undefined;
  }
}

export const storage = new SellAuthStorage();

// Keep the old MemStorage for potential fallback
export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private claims: Map<string, Claim>;
  private claimItems: Map<string, ClaimItem>;

  constructor() {
    this.users = new Map();
    this.claims = new Map();
    this.claimItems = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getClaim(id: string): Promise<Claim | undefined> {
    return this.claims.get(id);
  }

  async getClaimByInvoiceId(invoiceId: string): Promise<ClaimWithItems | undefined> {
    const claim = Array.from(this.claims.values()).find(
      (claim) => claim.invoiceId === invoiceId
    );
    
    if (!claim) return undefined;
    
    const items = Array.from(this.claimItems.values()).filter(
      (item) => item.claimId === claim.id
    );
    
    return { ...claim, items };
  }

  async getClaimByClaimId(claimId: string): Promise<ClaimWithItems | undefined> {
    const claim = Array.from(this.claims.values()).find(
      (claim) => claim.claimId === claimId
    );
    
    if (!claim) return undefined;
    
    const items = Array.from(this.claimItems.values()).filter(
      (item) => item.claimId === claim.id
    );
    
    return { ...claim, items };
  }

  async createClaim(insertClaim: InsertClaim): Promise<Claim> {
    const id = randomUUID();
    const claim: Claim = {
      id,
      claimId: this.generateClaimId(insertClaim.invoiceId),
      invoiceId: insertClaim.invoiceId,
      email: insertClaim.email,
      robloxUsername: null,
      verified: false,
      claimed: false,
      discordChannelId: null,
      createdAt: new Date(),
    };
    this.claims.set(id, claim);
    return claim;
  }

  private generateClaimId(invoiceId?: string): string {
    if (invoiceId && invoiceId.length >= 4) {
      // Extract first 2 and last 2 characters from invoice ID
      const first2 = invoiceId.substring(0, 2).toUpperCase();
      const last2 = invoiceId.substring(invoiceId.length - 2).toUpperCase();
      return `RYFT-${first2}${last2}`;
    }
    // Fallback for shorter invoice IDs
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const randomPart = Array.from({length: 4}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `RYFT-${randomPart}`;
  }

  async updateClaimVerification(id: string, verified: boolean): Promise<Claim | undefined> {
    const claim = this.claims.get(id);
    if (!claim) return undefined;
    
    const updatedClaim = { ...claim, verified };
    this.claims.set(id, updatedClaim);
    return updatedClaim;
  }

  async getClaimItems(claimId: string): Promise<ClaimItem[]> {
    return Array.from(this.claimItems.values()).filter(
      (item) => item.claimId === claimId
    );
  }

  async createClaimItem(insertItem: InsertClaimItem): Promise<ClaimItem> {
    const id = randomUUID();
    const item: ClaimItem = {
      id,
      claimId: insertItem.claimId,
      itemName: insertItem.itemName,
      itemCategory: insertItem.itemCategory,
      price: insertItem.price,
      quantity: insertItem.quantity || 1,
      imageUrl: insertItem.imageUrl || null,
      delivered: false,
    };
    this.claimItems.set(id, item);
    return item;
  }

  async updateClaimItemDelivery(id: string, delivered: boolean): Promise<ClaimItem | undefined> {
    const item = this.claimItems.get(id);
    if (!item) return undefined;
    
    const updatedItem = { ...item, delivered };
    this.claimItems.set(id, updatedItem);
    return updatedItem;
  }

  async markClaimAsClaimed(invoiceId: string): Promise<void> {
    const claim = Array.from(this.claims.values()).find(
      (claim) => claim.invoiceId === invoiceId
    );
    
    if (claim) {
      const updatedClaim = { ...claim, claimed: true };
      this.claims.set(claim.id, updatedClaim);
    }
    
    console.log(`Marked claim ${invoiceId} as claimed`);
  }

  async updateClaimDiscordChannel(invoiceId: string, channelId: string): Promise<void> {
    const claim = Array.from(this.claims.values()).find(
      (claim) => claim.invoiceId === invoiceId
    );
    
    if (claim) {
      const updatedClaim = { ...claim, discordChannelId: channelId };
      this.claims.set(claim.id, updatedClaim);
    }
    
    console.log(`Updated claim ${invoiceId} with Discord channel ${channelId}`);
  }

  async updateClaimVerificationByInvoiceId(invoiceId: string, verified: boolean): Promise<void> {
    const claim = Array.from(this.claims.values()).find(
      (claim) => claim.invoiceId === invoiceId
    );
    
    if (claim) {
      const updatedClaim = { ...claim, verified };
      this.claims.set(claim.id, updatedClaim);
    }
    
    console.log(`Updated claim verification by invoice ID: ${invoiceId} -> verified: ${verified}`);
  }

  async invalidateClaimsByInvoiceId(invoiceId: string): Promise<void> {
    // Find all claims with this invoice ID and mark them as claimed (unavailable)
    const claimsToInvalidate = Array.from(this.claims.values()).filter(
      (claim) => claim.invoiceId === invoiceId
    );
    
    for (const claim of claimsToInvalidate) {
      // Mark as claimed and set a special flag to indicate it was invalidated by staff
      const invalidatedClaim = { 
        ...claim, 
        claimed: true,
        claimId: `INVALIDATED-${claim.claimId}` // Prefix to mark as invalidated
      };
      
      // Update cache
      this.claims.set(claim.id, invalidatedClaim);
      
      console.log(`Invalidated claim ID: ${claim.claimId} for invoice: ${invoiceId}`);
    }
    
    console.log(`Completely invalidated invoice ID: ${invoiceId} and all linked claim IDs`);
  }

  async updateClaimChannelId(invoiceId: string, channelId: string): Promise<Claim | undefined> {
    // Find and update claim with Discord channel ID
    const claim = Array.from(this.claims.values()).find(
      (claim) => claim.invoiceId === invoiceId
    );
    
    if (claim) {
      const updatedClaim = { ...claim, discordChannelId: channelId };
      this.claims.set(claim.id, updatedClaim);
      console.log(`Updated claim ${invoiceId} with Discord channel ${channelId}`);
      return updatedClaim;
    }
    
    return undefined;
  }
}
