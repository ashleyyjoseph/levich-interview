# Live Bidding Platform

A real-time auction platform built with Node.js, Socket.io, and React JS. Users can compete to bid on items in real-time with proper race condition handling and synchronized countdown timers.

## Features

- **Real-time Bidding**: Instant bid updates using Socket.io
- **Race Condition Protection**: Handles concurrent bids safely using promise queues
- **Server-Synced Timers**: Countdown timers synchronized with server time to prevent client-side manipulation
- **Visual Feedback**: 
  - Green flash animation when new bids are placed
  - "Winning" badge for the highest bidder
  - "Outbid" state with red badge when outbid
- **RESTful API**: GET endpoints for items and server time
- **Docker Support**: Easy deployment with Docker and Docker Compose

## Tech Stack

### Backend
- Node.js
- Express.js
- Socket.io
- CORS

### Frontend
- React
- Socket.io-client
- Axios

## Project Structure

```
levich/
├── server/
│   ├── index.js           # Express server and Socket.io setup
│   └── auctionManager.js  # Auction logic with race condition handling
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.js    # Main dashboard component
│   │   │   └── AuctionCard.js  # Individual auction item card
│   │   ├── App.js
│   │   └── index.js
│   └── public/
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Docker (optional, for containerized deployment)

### Local Development

1. **Install dependencies:**
   ```bash
   # Install root dependencies (for concurrently)
   npm install
   
   # Install client dependencies
   cd client
   npm install
   cd ..
   ```

2. **Start the development servers:**
   ```bash
   npm run dev
   ```
   This will start:
   - Backend server on `http://localhost:5000`
   - React development server on `http://localhost:3000`

3. **Or run separately:**
   ```bash
   # Terminal 1 - Backend
   npm run server
   
   # Terminal 2 - Frontend
   npm run client
   ```

### Docker Deployment

1. **Build and run with Docker Compose:**
   ```bash
   docker-compose up --build
   ```

2. **Or build and run with Docker:**
   ```bash
   docker build -t live-bidding-platform .
   docker run -p 5000:5000 live-bidding-platform
   ```

3. **Access the application:**
   - Open `http://localhost:5000` in your browser

## API Endpoints

### REST API

- `GET /items` - Returns list of all auction items
- `GET /server-time` - Returns server timestamp for time synchronization

### Socket.io Events

#### Client → Server
- `BID_PLACED` - Place a bid on an item
  ```javascript
  {
    itemId: string,
    bidAmount: number,
    userId: string
  }
  ```

#### Server → Client
- `UPDATE_BID` - Broadcast when a new bid is placed
  ```javascript
  {
    itemId: string,
    currentBid: number,
    highestBidder: string,
    bidderId: string
  }
  ```
- `items_update` - Initial items data on connection
- `bid_success` - Confirmation of successful bid
- `bid_error` - Error message if bid fails
- `server_time` - Periodic server time updates for synchronization

## Race Condition Handling

The platform handles concurrent bids using a promise queue system:

1. When a bid is received, it's added to a queue for that specific item
2. Bids are processed sequentially per item
3. Each bid is validated after the previous one completes
4. If a bid becomes invalid (e.g., another bid was processed first), it's rejected with an appropriate error

This ensures that even if two users bid the same amount simultaneously, only the first one is accepted.

## Time Synchronization

The countdown timer is synchronized with the server to prevent client-side manipulation:

1. Client requests server time on connection
2. Calculates offset between client and server time
3. Receives periodic server time updates via Socket.io
4. Uses synchronized time for all countdown calculations

## Environment Variables

- `PORT` - Server port (default: 5000)
- `CLIENT_URL` - CORS origin for Socket.io (default: http://localhost:3000)
- `NODE_ENV` - Environment mode (development/production)

## Development Notes

- The auction data is stored in-memory. For production, replace with a database (e.g., MongoDB, PostgreSQL)
- User IDs are generated client-side. In production, implement proper authentication
- Socket IDs are used to track bidders. Consider using user sessions for production

## License

ISC
