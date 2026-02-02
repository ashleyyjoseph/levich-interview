/**
 * AuctionManager handles all auction logic including race condition protection
 * Uses a simple in-memory store (in production, this would be a database)
 */
class AuctionManager {
  constructor() {
    // In-memory storage for auction items
    // In production, this would be replaced with a database
    this.items = [];
    this.nextItemId = 1;

    // Map to track pending bids per item (prevents race conditions)
    // Key: itemId, Value: Promise resolving to bid result
    this.pendingBids = new Map();

    // Track bids by user name per item
    // Structure: { itemId: { userName: [{ amount, timestamp }] } }
    this.userBids = {};
  }

  /**
   * Get all auction items
   */
  getItems() {
    return this.items.map(item => ({
      id: item.id,
      title: item.title,
      startingPrice: item.startingPrice,
      currentBid: item.currentBid,
      duration: item.duration,
      auctionEndTime: item.auctionEndTime,
      highestBidder: item.highestBidder,
      bidderId: item.bidderId
    }));
  }

  /**
   * Get bids by user for a specific item
   */
  getUserBidsForItem(itemId) {
    if (!this.userBids[itemId]) {
      return {};
    }
    return this.userBids[itemId];
  }

  /**
   * Create a new auction item
   */
  createItem(title, startingPrice, duration) {
    const newItem = {
      id: String(this.nextItemId++),
      title,
      startingPrice,
      currentBid: startingPrice,
      duration: duration, // Store duration for when auction starts
      auctionEndTime: null, // Will be set when auction starts
      highestBidder: null,
      bidderId: null
    };

    this.items.push(newItem);
    this.userBids[newItem.id] = {};

    return newItem;
  }

  /**
   * Start an auction for an item
   */
  startAuction(itemId, durationMinutes) {
    const item = this.items.find(i => i.id === itemId);
    
    if (!item) {
      return { success: false, error: 'Item not found' };
    }

    if (item.auctionEndTime && Date.now() < item.auctionEndTime) {
      return { success: false, error: 'Auction is already active' };
    }

    // Use provided durationMinutes or fall back to item's stored duration
    const duration = durationMinutes || item.duration || 1;
    item.auctionEndTime = Date.now() + (duration * 60 * 1000);
    return { success: true, item };
  }

  /**
   * Place a bid on an item with race condition protection
   * Uses a promise queue per item to ensure only one bid is processed at a time
   * Now uses userName instead of userId
   */
  async placeBid(itemId, bidAmount, userName, socketId) {
    const item = this.items.find(i => i.id === itemId);

    if (!item) {
      return { success: false, error: 'Item not found', itemId };
    }

    // Check if auction has started
    if (!item.auctionEndTime) {
      return { success: false, error: 'Auction has not started yet', itemId };
    }

    // Check if auction has ended
    if (Date.now() >= item.auctionEndTime) {
      return { success: false, error: 'Auction has ended', itemId };
    }

    // Validate bid amount
    if (bidAmount <= item.currentBid) {
      return { 
        success: false, 
        error: `Bid must be higher than current bid of $${item.currentBid}`, 
        itemId 
      };
    }

    // Race condition protection: queue bids per item
    // If there's already a pending bid for this item, wait for it to complete
    if (this.pendingBids.has(itemId)) {
      await this.pendingBids.get(itemId);
    }

    // Create a new promise for this bid
    const bidPromise = this.processBid(item, bidAmount, userName, socketId);
    this.pendingBids.set(itemId, bidPromise);

    try {
      const result = await bidPromise;
      return result;
    } finally {
      // Clean up the pending bid promise
      this.pendingBids.delete(itemId);
    }
  }

  /**
   * Process a bid (called after race condition check)
   * Now tracks bids by user name
   */
  async processBid(item, bidAmount, userName, socketId) {
    // Double-check auction hasn't ended while waiting
    if (Date.now() >= item.auctionEndTime) {
      return { success: false, error: 'Auction has ended', itemId: item.id };
    }

    // Double-check bid amount is still valid (another bid might have been processed)
    if (bidAmount <= item.currentBid) {
      return { 
        success: false, 
        error: `Bid amount too low. Current bid is now $${item.currentBid}`, 
        itemId: item.id 
      };
    }

    // Initialize user bids tracking for this item if needed
    if (!this.userBids[item.id]) {
      this.userBids[item.id] = {};
    }
    if (!this.userBids[item.id][userName]) {
      this.userBids[item.id][userName] = [];
    }

    // Track this bid with timestamp (including milliseconds)
    const bidTimestamp = Date.now();
    this.userBids[item.id][userName].push({
      amount: bidAmount,
      timestamp: bidTimestamp
    });

    // Update the item
    const previousBidder = item.bidderId;
    item.currentBid = bidAmount;
    item.highestBidder = userName;
    item.bidderId = socketId;

    return {
      success: true,
      itemId: item.id,
      currentBid: item.currentBid,
      highestBidder: item.highestBidder,
      bidderId: item.bidderId,
      previousBidder: previousBidder
    };
  }
}

module.exports = { AuctionManager };
