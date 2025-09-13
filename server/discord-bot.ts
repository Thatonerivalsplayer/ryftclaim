import { Client, GatewayIntentBits, EmbedBuilder, ChannelType, SlashCommandBuilder, PermissionFlagsBits, TextChannel, PermissionsBitField, REST, Routes } from 'discord.js';
import { storage } from './storage';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildInvites
  ]
});

// Store invite cache and member tracking
const inviteCache = new Map();
const memberInviterCache = new Map();

const GUILD_ID = process.env.DISCORD_GUILD_ID!;
const DELIVERY_CATEGORY_ID = '1414912455104266301'; // Category for delivery channels
const COMMANDS_ONLY_CHANNEL_ID = '1414977763185528953'; // Channel where only bot commands are allowed

// Discord REST API for user lookup
const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN!);

// Function to get Discord user by username
export async function getDiscordUser(username: string) {
  try {
    console.log(`🔍 Looking up Discord user: ${username}`);
    
    // Get guild members to search for the username
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) {
      return { success: false, message: "Discord server not found" };
    }

    // Fetch all members if not cached
    await guild.members.fetch();
    
    // Search for user by username (case insensitive)
    const member = guild.members.cache.find(m => 
      m.user.username.toLowerCase() === username.toLowerCase() ||
      m.user.globalName?.toLowerCase() === username.toLowerCase()
    );

    if (!member) {
      return { 
        success: false, 
        message: `Discord user "${username}" not found in the server. Please make sure you've joined the Discord server and spelled your username correctly.` 
      };
    }

    const user = member.user;
    const avatarUrl = user.displayAvatarURL({ size: 256 });

    console.log(`✅ Found Discord user: ${user.username} (${user.id})`);

    return {
      success: true,
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      globalName: user.globalName,
      avatar: user.avatar,
      avatarUrl: avatarUrl
    };
  } catch (error) {
    console.error('Discord user lookup error:', error);
    return { 
      success: false, 
      message: "Error looking up Discord user. Please try again." 
    };
  }
}

// Slash command definitions
const claimCommand = new SlashCommandBuilder()
  .setName('claim')
  .setDescription('View your purchase details using your invoice ID')
  .addStringOption(option =>
    option.setName('invoiceid')
      .setDescription('Your invoice ID from the website or email (e.g., 4e6d5d5941fbd-0000006644093)')
      .setRequired(true));

const claimedCommand = new SlashCommandBuilder()
  .setName('claimed')
  .setDescription('Mark an order as claimed (Staff only)')
  .addStringOption(option =>
    option.setName('invoiceid')
      .setDescription('The invoice ID to mark as claimed')
      .setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

const minesCommand = new SlashCommandBuilder()
  .setName('mines')
  .setDescription('Play the diamond mines game for a chance to win a 100% discount code!');


client.once('ready', async () => {
  console.log(`Discord bot ready! Logged in as ${client.user?.tag}`);
  console.log(`Bot is in ${client.guilds.cache.size} guilds`);
  
  // List all guilds the bot is in
  client.guilds.cache.forEach(guild => {
    console.log(`- ${guild.name} (${guild.id})`);
  });

  // Cache all existing invites for invite tracking
  console.log('Caching invites for tracking...');
  const guilds = Array.from(client.guilds.cache.values());
  for (const guild of guilds) {
    try {
      const invites = await guild.invites.fetch();
      const inviteData = new Map();
      
      invites.forEach((invite: any) => {
        inviteData.set(invite.code, {
          uses: invite.uses || 0,
          inviter: invite.inviter
        });
      });
      
      inviteCache.set(guild.id, inviteData);
      console.log(`Cached ${invites.size} invites for guild: ${guild.name}`);
    } catch (error) {
      console.log(`Could not fetch invites for guild ${guild.name}: ${error}`);
    }
  }
  
  // Register slash command only to guilds for immediate availability
  try {
    // Clear existing global commands to avoid duplicates
    await client.application?.commands.set([]);
    console.log('Cleared existing global commands');
    
    // Register to ALL guilds the bot is in for immediate availability
    client.guilds.cache.forEach(async (guild, guildId) => {
      try {
        // Clear existing guild commands first
        await guild.commands.set([]);
        // Register all commands
        await guild.commands.create(claimCommand);
        await guild.commands.create(claimedCommand);
        await guild.commands.create(minesCommand);
        console.log(`Discord slash commands registered to guild: ${guild.name} (${guildId})`);
      } catch (guildError) {
        console.error(`Error registering to guild ${guild.name}:`, guildError);
      }
    });
    
    // If no guilds found, provide invite link
    if (client.guilds.cache.size === 0) {
      const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${client.application?.id}&permissions=268444672&scope=bot%20applications.commands`;
      console.log(`⚠️  Bot is not in any servers! Invite it using: ${inviteUrl}`);
    }
    
  } catch (error) {
    console.error('Error registering Discord slash command:', error);
  }
});

// Auto-clear commands channel every minute
setInterval(async () => {
  try {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) return;
    
    const channel = guild.channels.cache.get(COMMANDS_ONLY_CHANNEL_ID) as TextChannel;
    if (!channel) return;
    
    // Delete all messages in the channel
    const messages = await channel.messages.fetch({ limit: 100 });
    if (messages.size > 0) {
      await channel.bulkDelete(messages);
      console.log(`🧹 Auto-cleared ${messages.size} messages from commands channel`);
    }
    
    // Post the instructions embed
    const instructionsEmbed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('ONLY DO COMMANDS HERE <:Kitsune:1414189501009367111>')
      .setDescription('USE /claim (followed by your invoice id) to claim orders from the web, only commands from bots are allowed.')
      .setTimestamp();
    
    await channel.send({ embeds: [instructionsEmbed] });
    
  } catch (error) {
    console.error('Error in auto-clear:', error);
  }
}, 25000); // Run every 25 seconds

// Track new invites being created
client.on('inviteCreate', (invite) => {
  if (!invite.guild) return;
  const guildInvites = inviteCache.get(invite.guild.id) || new Map();
  guildInvites.set(invite.code, {
    uses: invite.uses || 0,
    inviter: invite.inviter
  });
  inviteCache.set(invite.guild.id, guildInvites);
  console.log(`New invite created: ${invite.code} by ${invite.inviter?.username}`);
});

// Track members joining to determine who invited them
client.on('guildMemberAdd', async (member) => {
  try {
    const newInvites = await member.guild.invites.fetch();
    const oldInvites = inviteCache.get(member.guild.id) || new Map();
    
    // Find which invite was used (increased use count)
    const usedInvite = newInvites.find(invite => {
      const oldInvite = oldInvites.get(invite.code);
      return oldInvite && (invite.uses || 0) > oldInvite.uses;
    });
    
    if (usedInvite && usedInvite.inviter) {
      // Store who invited this member
      memberInviterCache.set(member.id, {
        inviterId: usedInvite.inviter.id,
        inviterUsername: usedInvite.inviter.username,
        joinedAt: new Date(),
        inviteCode: usedInvite.code
      });
      
      console.log(`${member.user.username} was invited by ${usedInvite.inviter.username} using invite ${usedInvite.code}`);
    } else {
      console.log(`${member.user.username} joined but couldn't determine inviter`);
    }
    
    // Update invite cache with new usage counts
    const guildInvites = inviteCache.get(member.guild.id) || new Map();
    newInvites.forEach(invite => {
      guildInvites.set(invite.code, {
        uses: invite.uses || 0,
        inviter: invite.inviter
      });
    });
    inviteCache.set(member.guild.id, guildInvites);
    
  } catch (error) {
    console.error(`Error tracking invite for ${member.user.username}: ${error}`);
  }
});

// Immediate message filtering for commands-only channel
client.on('messageCreate', async message => {
  // Ignore bot messages
  if (message.author.bot) return;
  
  // Check if message is in the commands-only channel
  if (message.channel.id === COMMANDS_ONLY_CHANNEL_ID) {
    try {
      // Delete any non-bot message immediately
      await message.delete();
      
      // Timeout the user for 1 minute (60000 milliseconds)
      if (message.member && message.guild) {
        await message.member.timeout(60000, 'Posted message in commands-only channel');
      }
      
      // Send warning message (ephemeral-like by deleting after a few seconds)
      const warningMessage = await message.channel.send({
        content: `${message.author}, only commands from the Ryft Stock bot are allowed in this channel. You have been muted for 1 minute.`
      });
      
      // Delete warning message after 5 seconds
      setTimeout(async () => {
        try {
          await warningMessage.delete();
        } catch (deleteError) {
          console.error('Error deleting warning message:', deleteError);
        }
      }, 5000);
      
      console.log(`🔨 Auto-moderation: Deleted message from ${message.author.tag} in commands-only channel and muted for 1 minute`);
      
    } catch (error) {
      console.error('Error in auto-moderation:', error);
    }
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'claim') {
    const invoiceId = interaction.options.getString('invoiceid');
    
    if (!invoiceId) {
      await interaction.reply({ content: 'Please provide your invoice ID from the website or your email.', ephemeral: true });
      return;
    }

    // Only allow invoice IDs from website - no claim codes
    if (invoiceId.startsWith('RYFT-') || invoiceId.length < 10) {
      await interaction.reply({ 
        content: `❌ Please use your **invoice ID from the website or email**.\n\nExample: \`4e6d5d5941fbd-0000006644093\`\n\nYou can find this in your email receipt or on the website.`, 
        ephemeral: true 
      });
      return;
    }

    try {
      // Find the invoice in SellAuth
      const claimWithItems = await storage.getClaimByInvoiceId(invoiceId);
      if (!claimWithItems) {
        await interaction.reply({ 
          content: `❌ Invoice ID ${invoiceId} not found. Please check your invoice ID and try again.`, 
          ephemeral: true 
        });
        return;
      }

      // Check if invoice was invalidated by staff (BLOCKED or INVALIDATED claims)
      if (claimWithItems.claimId === 'BLOCKED' || claimWithItems.claimId.startsWith('INVALIDATED-')) {
        await interaction.reply({ 
          content: `❌ This invoice ID has been **invalidated by staff** and cannot be used.\n\nIf you believe this is an error, please contact support in our Discord server.`, 
          ephemeral: true 
        });
        return;
      }

      // Format the purchase date
      const purchaseDate = claimWithItems.createdAt 
        ? new Date(claimWithItems.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : 'Unknown';

      // Calculate total price from items
      const totalPrice = claimWithItems.items?.reduce((sum, item) => {
        return sum + (parseFloat(item.price) * item.quantity);
      }, 0) || 0;

      // Format items list
      const itemsList = claimWithItems.items?.map(item => 
        `• **${item.itemName}** (x${item.quantity}) - $${(parseFloat(item.price) * item.quantity).toFixed(2)}`
      ).join('\n') || 'No items found';

      // Create delivery channel automatically when /claim is used
      console.log(`🎯 Creating delivery channel for /claim command: ${invoiceId}`);
      
      const channelResult = await createDeliveryChannel({
        invoiceId: claimWithItems.invoiceId,
        email: claimWithItems.email,
        robloxUsername: claimWithItems.robloxUsername || 'Unknown',
        items: claimWithItems.items,
        userId: interaction.user.id // Pass the Discord user ID of who used /claim
      });

      // Create purchase details embed
      const purchaseEmbed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('🧾 Purchase Details')
        .setDescription(`Here are the details for invoice **${invoiceId}**`)
        .addFields(
          { name: '💰 Total Price', value: `$${totalPrice.toFixed(2)}`, inline: true },
          { name: '📅 Purchase Date', value: purchaseDate, inline: true },
          { name: '📧 Email', value: claimWithItems.email || 'N/A', inline: true },
          { name: '🎮 Roblox Username', value: claimWithItems.robloxUsername || 'Not set', inline: true },
          { name: '✅ Status', value: claimWithItems.verified ? 'Verified' : 'Pending Verification', inline: true },
          { name: '🎫 Claim ID', value: claimWithItems.claimId || 'Not generated', inline: true },
          { name: '📦 Items Purchased', value: itemsList, inline: false }
        )
        .setTimestamp()
        .setFooter({ text: 'Ryft Stock Garden Store' });

      // Add channel creation status to embed
      if (channelResult.success) {
        purchaseEmbed.addFields({
          name: '📍 Delivery Channel',
          value: `✅ Created: <#${channelResult.channelId}>\nChannel: #${channelResult.channelName}`,
          inline: false
        });
        console.log(`🎯 Channel created successfully: #${channelResult.channelName}`);
      } else {
        purchaseEmbed.addFields({
          name: '📍 Delivery Channel',
          value: `❌ Failed to create channel: ${channelResult.message}`,
          inline: false
        });
        console.error(`🎯 Channel creation failed: ${channelResult.message}`);
      }

      await interaction.reply({ embeds: [purchaseEmbed], ephemeral: true });

    } catch (error) {
      console.error('Error processing /claim command:', error);
      await interaction.reply({ content: '❌ Error retrieving purchase details. Please try again or contact support.', ephemeral: true });
    }
  }


  if (interaction.commandName === 'claimed') {
    const invoiceId = interaction.options.getString('invoiceid');
    
    if (!invoiceId) {
      await interaction.reply({ content: 'Please provide an invoice ID.', flags: 64 });
      return;
    }

    try {
      // Get the claim
      const claimWithItems = await storage.getClaimByInvoiceId(invoiceId);
      if (!claimWithItems) {
        await interaction.reply({ content: `❌ Invoice ID ${invoiceId} not found.`, flags: 64 });
        return;
      }

      if (claimWithItems.claimed) {
        await interaction.reply({ content: `⚠️ Invoice ${invoiceId} is already marked as claimed.`, flags: 64 });
        return;
      }

      // Completely invalidate the invoice and all linked claim IDs
      await storage.invalidateClaimsByInvoiceId(invoiceId);

      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('🚫 Invoice Completely Invalidated')
        .addFields(
          { name: 'Invoice ID', value: `~~${invoiceId}~~`, inline: true },
          { name: 'Roblox Username', value: claimWithItems.robloxUsername || 'N/A', inline: true },
          { name: 'Email', value: claimWithItems.email || 'N/A', inline: true },
          { name: 'Original Claim ID', value: `~~${claimWithItems.claimId}~~` || 'N/A', inline: true },
          { name: 'Status', value: '🚫 **INVALIDATED**', inline: true }
        )
        .addFields(
          { name: '⚠️ Actions Taken:', value: '• Invoice ID marked as unavailable\n• All linked claim IDs invalidated\n• No further claims can be made', inline: false }
        )
        .setTimestamp()
        .setFooter({ text: `Invalidated by ${interaction.user.tag}` });

      await interaction.reply({ embeds: [embed] });

      // Check if we're in a web-order channel and delete it after 5 seconds
      if (interaction.channel && 'name' in interaction.channel && interaction.channel.name && interaction.channel.name.startsWith('web-order-')) {
        // Send follow-up message about deleting the channel
        await interaction.followUp({ 
          content: '🗑️ **Deleting ticket in 5 seconds...**', 
          ephemeral: false 
        });
        
        // Delete the channel after 5 seconds
        setTimeout(async () => {
          try {
            if (interaction.channel && 'delete' in interaction.channel && 'name' in interaction.channel) {
              const channelName = interaction.channel.name;
              await interaction.channel.delete('Order marked as claimed - cleaning up delivery channel');
              console.log(`Deleted delivery channel: ${channelName} after /claimed command`);
            }
          } catch (deleteError) {
            console.error('Error deleting channel:', deleteError);
          }
        }, 5000);
      }

    } catch (error) {
      console.error('Error processing /claimed command:', error);
      await interaction.reply({ content: '❌ Error processing command. Please try again.', flags: 64 });
    }
  }




  if (interaction.commandName === 'mines') {
    try {
      // Generate rigged game grid - 3 diamonds, 15 mines, but player never wins
      const grid = generateRiggedMinesGrid();
      const gameId = Math.random().toString(36).substring(7);
      
      // Show game grid with buttons
      const embed = new EmbedBuilder()
        .setColor(0xffd700)
        .setTitle('💎 Diamond Mines Game')
        .setDescription('Find the diamonds and avoid the mines!\n**3 Diamonds** hidden among **15 Mines**\n\n🏆 **Reward**: 100% Discount Code\n💎 Find all 3 diamonds to win!')
        .addFields(
          { name: '📋 How to Play', value: '• Click on tiles to reveal them\n• Find all 3 diamonds without hitting a mine\n• Hit a mine and you lose!', inline: false }
        )
        .setFooter({ text: 'Good luck! 🍀' });

      // Create button grid (4x5 = 20 tiles)
      const buttons = [];
      for (let i = 0; i < 4; i++) {
        const row = [];
        for (let j = 0; j < 5; j++) {
          const position = i * 5 + j;
          row.push({
            type: 2,
            style: 2, // Secondary style (gray)
            label: '❓',
            custom_id: `mine_${gameId}_${position}`,
          });
        }
        buttons.push({ type: 1, components: row });
      }

      await interaction.reply({ 
        embeds: [embed], 
        components: buttons,
        ephemeral: true 
      });

    } catch (error) {
      console.error('Error processing /mines command:', error);
      await interaction.reply({ content: '❌ Error starting mines game. Please try again.', ephemeral: true });
    }
  }
});

// Handle button interactions for mines game
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId.startsWith('mine_')) {
    try {
      const [, gameId, positionStr] = interaction.customId.split('_');
      const position = parseInt(positionStr);
      
      // Always make player lose (rigged)
      const loseEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('💥 BOOM! You hit a mine!')
        .setDescription('**Game Over!**\n\nYou uncovered a mine and lost the game.')
        .addFields(
          { name: '🎯 What was hidden:', value: generateRevealGrid(position), inline: false },
          { name: '🏆 Prize Pool', value: '100% Discount Code (Worth $50+)', inline: true },
          { name: '🎮 Try Again', value: 'Use `/mines` to play another round!', inline: true }
        )
        .setFooter({ text: 'Better luck next time! 🍀' });

      await interaction.update({ 
        embeds: [loseEmbed], 
        components: [] // Remove all buttons
      });

    } catch (error) {
      console.error('Error handling mines button:', error);
      await interaction.reply({ content: '❌ Error processing game action.', ephemeral: true });
    }
  }
});

// Generate rigged mines grid (player always loses)
function generateRiggedMinesGrid(): { diamonds: number[], mines: number[] } {
  const diamonds = [2, 7, 15]; // Fixed diamond positions
  const mines = [];
  
  // Fill rest with mines (17 total - 3 diamonds = 14 mines, but we want 15 mines)
  for (let i = 0; i < 20; i++) {
    if (!diamonds.includes(i)) {
      mines.push(i);
    }
  }
  
  return { diamonds, mines };
}

// Generate reveal grid showing where diamonds and mines were
function generateRevealGrid(clickedPosition: number): string {
  const { diamonds, mines } = generateRiggedMinesGrid();
  let grid = '';
  
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 5; j++) {
      const pos = i * 5 + j;
      if (pos === clickedPosition) {
        grid += '💥'; // Where they clicked (mine)
      } else if (diamonds.includes(pos)) {
        grid += '💎'; // Diamond positions
      } else {
        grid += '💣'; // Mine positions
      }
      
      if (j < 4) grid += ' ';
    }
    if (i < 3) grid += '\n';
  }
  
  return '```\n' + grid + '\n```';
}

// Create delivery channel for order
export async function createDeliveryChannel(orderData: {
  invoiceId: string;
  email: string;
  robloxUsername: string;
  discordUsername?: string;
  items: any[];
  userId?: string; // Discord user ID of the person claiming
}): Promise<{ success: boolean; channelName?: string; channelId?: string; message: string; userAdded?: boolean }> {
  console.log(`🎯 createDeliveryChannel called for order: ${orderData.invoiceId}`);
  console.log(`🎯 Guild ID: ${GUILD_ID}, Category ID: ${DELIVERY_CATEGORY_ID}`);
  
  try {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) {
      throw new Error('Guild not found');
    }

    // Check if category exists
    const category = guild.channels.cache.get(DELIVERY_CATEGORY_ID);
    if (!category || category.type !== ChannelType.GuildCategory) {
      throw new Error(`Category ${DELIVERY_CATEGORY_ID} not found`);
    }

    // Create channel name with format: web-order-ryft-{first2}{last2}
    let invoiceId = orderData.invoiceId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    
    // If the invoice ID looks like an error or is too short, generate fallback
    if (invoiceId.length < 4 || invoiceId.includes('failed') || invoiceId.includes('error')) {
      // Generate a random short ID for fallback
      const randomId = Math.random().toString(36).substring(2, 6);
      invoiceId = randomId;
    }
    
    // Get first 2 and last 2 characters
    const first2 = invoiceId.substring(0, 2);
    const last2 = invoiceId.substring(invoiceId.length - 2);
    
    const channelName = `web-order-ryft-${first2}${last2}`;
    
    // Check if channel already exists
    const existingChannel = guild.channels.cache.find(
      ch => ch.name === channelName && ch.type === ChannelType.GuildText
    );
    
    if (existingChannel) {
      // For existing channels, try to add user permissions if userId is provided
      let userAdded = false;
      if (orderData.userId) {
        try {
          const member = await guild.members.fetch(orderData.userId);
          if (member && existingChannel.type === ChannelType.GuildText) {
            await (existingChannel as TextChannel).permissionOverwrites.edit(member.id, {
              ViewChannel: true,
              SendMessages: true,
              ReadMessageHistory: true,
              AttachFiles: true,
              EmbedLinks: true,
            });
            userAdded = true;
            console.log(`🎯 Added permissions to existing channel for user: ${orderData.userId} (${member.user.username})`);
          }
        } catch (permError) {
          console.warn(`Could not add user permissions to existing channel: ${permError}`);
          userAdded = false;
        }
      }
      
      return {
        success: true,
        channelName: existingChannel.name,
        channelId: existingChannel.id,
        message: `Channel #${existingChannel.name} already exists for this order`,
        userAdded: userAdded
      };
    }

    // Create new PRIVATE text channel with permission overwrites
    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: DELIVERY_CATEGORY_ID,
      topic: `Delivery channel for order ${orderData.invoiceId.substring(0, 90)}`,
      reason: `Automated delivery channel for ${orderData.robloxUsername}`,
      permissionOverwrites: [
        {
          // Deny @everyone from seeing the channel
          id: guild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          // Allow bot to manage channel
          id: client.user!.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ManageMessages,
            PermissionsBitField.Flags.EmbedLinks,
            PermissionsBitField.Flags.AttachFiles,
          ],
        },
        {
          // Allow server owner to view and manage
          id: guild.ownerId,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.ManageMessages,
            PermissionsBitField.Flags.AttachFiles,
            PermissionsBitField.Flags.EmbedLinks,
          ],
        },
      ],
    });

    // Send order details embed to the channel
    const orderEmbed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('🎮 New Garden Item Delivery')
      .setDescription(`Order details for **${orderData.robloxUsername}**`)
      .addFields(
        { name: '📋 Order ID', value: `\`${orderData.invoiceId}\``, inline: true },
        { name: '📧 Email', value: orderData.email, inline: true },
        { name: '🎮 Roblox Username', value: orderData.robloxUsername, inline: true },
        { 
          name: '📦 Items Purchased', 
          value: orderData.items.map(item => `• **${item.itemName}** (x${item.quantity}) - $${item.price}`).join('\n') || 'No items found',
          inline: false 
        }
      )
      .setTimestamp()
      .setFooter({ text: 'Ryft Stock - Garden Items Delivery' });

    // Add permission for the specific user who claimed (if provided)
    let userAdded = false;
    if (orderData.userId) {
      try {
        // First verify the user exists in the server using guild.members.fetch
        const member = await guild.members.fetch(orderData.userId);
        if (member) {
          // Use permissionOverwrites.edit for more reliable permission setting
          await channel.permissionOverwrites.edit(member.id, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            AttachFiles: true,
            EmbedLinks: true,
          });
          userAdded = true;
          console.log(`🎯 Successfully added permissions for user: ${orderData.userId} (${member.user.username})`);
        }
      } catch (permError) {
        console.warn(`Could not add user permissions for ${orderData.userId}: ${permError}`);
        userAdded = false;
        // Continue anyway, channel was created
      }
    }

    await (channel as TextChannel).send({ embeds: [orderEmbed] });

    // Update claim with Discord channel ID
    await storage.updateClaimDiscordChannel(orderData.invoiceId, channel.id);

    console.log(`Created delivery channel: #${channelName} for order ${orderData.invoiceId}`);

    return {
      success: true,
      channelName: channel.name,
      channelId: channel.id,
      message: `Delivery channel #${channel.name} created successfully`,
      userAdded: userAdded
    };

  } catch (error) {
    console.error('Error creating delivery channel:', error);
    return {
      success: false,
      message: `Failed to create delivery channel: ${error instanceof Error ? error.message : 'Unknown error'}`,
      userAdded: false
    };
  }
}

// Send message to delivery channel
export async function sendDeliveryMessage(channelId: string, message: string): Promise<boolean> {
  try {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) return false;

    const channel = guild.channels.cache.get(channelId) as TextChannel;
    if (!channel || channel.type !== ChannelType.GuildText) return false;

    await channel.send(message);
    return true;
  } catch (error) {
    console.error('Error sending delivery message:', error);
    return false;
  }
}

// Delete delivery channel
export async function deleteDeliveryChannel(channelId: string): Promise<boolean> {
  try {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) return false;

    const channel = guild.channels.cache.get(channelId);
    if (!channel) return false;

    await channel.delete('Order completed - cleaning up delivery channel');
    console.log(`Deleted delivery channel: ${channel.name}`);
    return true;
  } catch (error) {
    console.error('Error deleting delivery channel:', error);
    return false;
  }
}

export async function addUserToServer(userData: {
  invoiceId: string;
  email: string;
  robloxUsername: string;
  items: any[];
}) {
  // This function is now deprecated since we use the /claim command instead
  // But keeping it for backward compatibility
  try {
    console.log(`Legacy Discord authorization for ${userData.robloxUsername}, invoice: ${userData.invoiceId}`);
    
    return {
      success: true,
      message: "Discord authorization successful! Please use the /claim command in Discord.",
      inviteUrl: "https://discord.gg/ryftstock",
      channelName: `Use /claim command with your claim ID`
    };

  } catch (error) {
    console.error('Discord authorization error:', error);
    return {
      success: false,
      message: 'Discord authorization failed. Please try again.',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function startBot() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.error('DISCORD_BOT_TOKEN environment variable not set');
    return;
  }
  
  if (!GUILD_ID) {
    console.error('DISCORD_GUILD_ID environment variable not set');
    return;
  }

  try {
    await client.login(token);
  } catch (error) {
    console.error('Failed to start Discord bot:', error);
  }
}