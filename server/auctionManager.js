/**
 * AuctionManager handles all auction logic including race condition protection
 * Uses a simple in-memory store (in production, this would be a database)
 */
class AuctionManager {
  constructor() {
    // In-memory storage for auction items
    // In production, this would be replaced with a database
    this.items = [
      {
        id: '1',
        title: 'Vintage Watch',
        startingPrice: 50,
        currentBid: 50,
        auctionEndTime: Date.now() + 1 * 60 * 1000, // 1 minute from now
        highestBidder: null,
        bidderId: null
      },
      {
        id: '2',
        title: 'Rare Painting',
        startingPrice: 100,
        currentBid: 100,
        auctionEndTime: Date.now() + 1 * 60 * 1000, // 1 minute from now
        highestBidder: null,
        bidderId: null
      },
      {
        id: '3',
        title: 'Antique Vase',
        startingPrice: 75,
        currentBid: 75,
        auctionEndTime: Date.now() + 1 * 60 * 1000, // 1 minute from now
        highestBidder: null,
        bidderId: null
      }
    ];

    // Map to track pending bids per item (prevents race conditions)
    // Key: itemId, Value: Promise resolving to bid result
    this.pendingBids = new Map();
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
      auctionEndTime: item.auctionEndTime,
      highestBidder: item.highestBidder,
      bidderId: item.bidderId
    }));
  }

  /**
   * Place a bid on an item with race condition protection
   * Uses a promise queue per item to ensure only one bid is processed at a time
   */
  async placeBid(itemId, bidAmount, userId, socketId) {
    const item = this.items.find(i => i.id === itemId);

    if (!item) {
      return { success: false, error: 'Item not found', itemId };
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
    const bidPromise = this.processBid(item, bidAmount, userId, socketId);
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
   */
  async processBid(item, bidAmount, userId, socketId) {
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

    // Update the item
    const previousBidder = item.bidderId;
    item.currentBid = bidAmount;
    item.highestBidder = userId;
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
