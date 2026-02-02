const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const { AuctionManager } = require('./auctionManager');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
}

const auctionManager = new AuctionManager();

// REST API: GET /items
app.get('/items', (req, res) => {
  const items = auctionManager.getItems();
  res.json(items);
});

// REST API: GET /server-time (for time synchronization)
app.get('/server-time', (req, res) => {
  res.json({ serverTime: Date.now() });
});

// Admin API: POST /admin/items - Create a new auction item
app.post('/admin/items', (req, res) => {
  try {
    const { title, startingPrice, duration } = req.body;

    if (!title || startingPrice === undefined || !duration) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: title, startingPrice, duration' 
      });
    }

    if (startingPrice <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Starting price must be greater than 0' 
      });
    }

    if (duration <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Duration must be greater than 0' 
      });
    }

    const newItem = auctionManager.createItem(title, startingPrice, duration);
    res.json({ success: true, item: newItem });
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Admin API: POST /admin/items/:id/start - Start an auction
app.post('/admin/items/:id/start', (req, res) => {
  try {
    const { id } = req.params;
    const { duration } = req.body;

    // Use duration from request body, or default to 1 minute if not provided
    const durationMinutes = duration || 1;

    const result = auctionManager.startAuction(id, durationMinutes);
    
    if (result.success) {
      // Broadcast updated items to all connected clients
      io.emit('items_update', auctionManager.getItems());
      res.json({ success: true, item: result.item });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Error starting auction:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// API: GET /items/:id/bids - Get bids by user for an item
app.get('/items/:id/bids', (req, res) => {
  try {
    const { id } = req.params;
    const userBids = auctionManager.getUserBidsForItem(id);
    res.json({ success: true, userBids });
  } catch (error) {
    console.error('Error fetching user bids:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send initial items data to newly connected client
  socket.emit('items_update', auctionManager.getItems());

  /**
   * BID_PLACED: Client sends a bid
   * Server validates:
   * - Bid is higher than current bid
   * - Auction hasn't ended
   * On success: Broadcasts UPDATE_BID to all connected clients instantly
   */
  socket.on('BID_PLACED', async (data) => {
    try {
      const { itemId, bidAmount, userName } = data;

      // Validate required fields
      if (!itemId || !bidAmount || !userName) {
        socket.emit('bid_error', { message: 'Missing required fields' });
        return;
      }

      // Attempt to place bid
      // auctionManager.placeBid() validates:
      // - Bid amount is higher than current bid
      // - Auction hasn't ended
      // - Handles race conditions internally
      const result = await auctionManager.placeBid(itemId, bidAmount, userName, socket.id);

      if (result.success) {
        // UPDATE_BID: Broadcast new highest bid to all connected clients instantly
        io.emit('UPDATE_BID', {
          itemId: result.itemId,
          currentBid: result.currentBid,
          highestBidder: result.highestBidder,
          bidderId: result.bidderId
        });

        // Broadcast updated items to all clients (includes user bid tracking)
        io.emit('items_update', auctionManager.getItems());

        // Send confirmation to the bidder
        socket.emit('bid_success', {
          itemId: result.itemId,
          message: 'Bid placed successfully'
        });
      } else {
        // Send error to the bidder (validation failed)
        socket.emit('bid_error', {
          message: result.error,
          itemId: result.itemId
        });
      }
    } catch (error) {
      console.error('Error handling bid:', error);
      socket.emit('bid_error', { message: 'Internal server error' });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Broadcast server time periodically for synchronization
setInterval(() => {
  io.emit('server_time', { serverTime: Date.now() });
}, 1000);

// Serve React app in production (catch-all handler)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
