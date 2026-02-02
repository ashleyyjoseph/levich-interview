# Live Bidding Platform

A real-time auction platform built with Node.js, Socket.io, and React. Users can compete to bid on items in real-time with proper race condition handling and synchronized countdown timers. The platform includes separate admin and user interfaces for managing and participating in auctions.

## Features

### User Features
- **Real-time Bidding**: Instant bid updates using Socket.io
- **Race Condition Protection**: Handles concurrent bids safely using promise queues
- **Server-Synced Timers**: Countdown timers synchronized with server time to prevent client-side manipulation
- **Visual Feedback**: 
  - Green flash animation when new bids are placed
  - "Winning" badge for the highest bidder
  - "Outbid" state with red badge when outbid
- **Bid History**: View all bids placed by users on each auction item
- **Real-time Updates**: See live updates when other users place bids

### Admin Features
- **Create Auction Items**: Add new items with title, starting price, and duration
- **Start Auctions**: Manually start auctions for created items
- **Monitor Auctions**: View all auctions with their current status (Not Started, Active, Ended)
- **Auction Management**: Track current bids, highest bidders, and auction end times
- **Real-time Dashboard**: See live updates of all auction activities

### Technical Features
- **RESTful API**: Complete API for items, bids, and admin operations
- **Socket.io Integration**: Real-time bidirectional communication
- **Docker Support**: Easy deployment with Docker and Docker Compose
- **Production Ready**: Built-in support for production deployment

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
│   │   │   ├── Dashboard.js    # Main user dashboard component
│   │   │   ├── AuctionCard.js  # Individual auction item card
│   │   │   ├── AdminPanel.js   # Admin interface for managing auctions
│   │   │   ├── NameInput.js    # Initial name input component
│   │   │   └── Toast.js        # Toast notification component
│   │   ├── contexts/
│   │   │   └── ToastContext.js # Toast notification context
│   │   ├── App.js              # Main app component with routing logic
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

1. **Clone the repository** (if applicable) or navigate to the project directory

2. **Install dependencies:**
   ```bash
   # Install root dependencies (for concurrently and server dependencies)
   npm install
   
   # Install client dependencies
   cd client
   npm install
   cd ..
   ```

3. **Start the development servers:**
   ```bash
   npm run dev
   ```
   This will start:
   - Backend server on `http://localhost:5000`
   - React development server on `http://localhost:3000`

4. **Access the application:**
   - Open `http://localhost:3000` in your browser
   - You will be prompted to enter your name

5. **Or run separately:**
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
   - You will be prompted to enter your name

## Usage Guide

### For Users

1. **Access the Platform:**
   - Open the application in your browser (default: `http://localhost:3000` for development or `http://localhost:5000` for production)
   - Enter your name when prompted (any name except "admin")
   - Click "Continue" to access the user dashboard

2. **Viewing Auctions:**
   - All available auction items are displayed on the dashboard
   - Each card shows:
     - Item title
     - Current bid amount
     - Highest bidder name
     - Countdown timer (if auction is active)
     - Your bid history for that item

3. **Placing Bids:**
   - Click the "+$10" button on an active auction to place a bid
   - Your bid must be higher than the current bid
   - You'll see a green flash animation when a new bid is placed
   - If you're the highest bidder, you'll see a "Winning" badge
   - If you're outbid, you'll see an "Outbid" badge

4. **Bid History:**
   - View all bids you've placed on each item
   - Bids are displayed with timestamps

### For Admins

1. **Access Admin Panel:**
   - Open the application in your browser
   - Enter "admin" (case-insensitive) as your name
   - Click "Continue" to access the admin panel

2. **Creating Auction Items:**
   - Fill in the "Create New Auction Item" form:
     - **Item Title**: Name of the auction item
     - **Starting Price**: Initial bid amount (must be greater than 0)
     - **Duration**: Auction duration in minutes (must be at least 1)
   - Click "Create Item" to add the item
   - The item will appear in the "Manage Auctions" section with "Not Started" status

3. **Starting Auctions:**
   - Find the item you want to start in the "Manage Auctions" section
   - Click the "Start Auction" button
   - The auction will begin immediately and run for the specified duration
   - Status will change to "Active"
   - Users can now place bids on this item

4. **Monitoring Auctions:**
   - View all items and their current status:
     - **Not Started**: Item created but auction hasn't started
     - **Active**: Auction is currently running
     - **Ended**: Auction has completed
   - See real-time updates of:
     - Current bid amount
     - Highest bidder name
     - Auction end time
   - All updates are synchronized in real-time across all connected clients

## API Endpoints

### REST API

#### Public Endpoints
- `GET /items` - Returns list of all auction items
- `GET /server-time` - Returns server timestamp for time synchronization
- `GET /items/:id/bids` - Returns all user bids for a specific item

#### Admin Endpoints
- `POST /admin/items` - Create a new auction item
  ```javascript
  Request Body:
  {
    title: string,
    startingPrice: number,
    duration: number  // in minutes
  }
  
  Response:
  {
    success: boolean,
    item: object
  }
  ```

- `POST /admin/items/:id/start` - Start an auction for an item
  ```javascript
  Response:
  {
    success: boolean,
    item: object
  }
  ```

### Socket.io Events

#### Client → Server
- `BID_PLACED` - Place a bid on an item
  ```javascript
  {
    itemId: string,
    bidAmount: number,
    userName: string
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
- `items_update` - Initial items data on connection and updates when items change
- `bid_success` - Confirmation of successful bid
- `bid_error` - Error message if bid fails
- `server_time` - Periodic server time updates for synchronization (every 1 second)

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

## Important Notes

### Authentication
- Currently, admin access is granted by entering "admin" (case-insensitive) as the name
- User names are entered on first access and used throughout the session


### Data Storage
- The auction data is stored in-memory and will be lost on server restart

- User bids are tracked per item and per user name

### Security Considerations
- Admin endpoints are not currently protected by authentication

- Socket IDs are used to track bidders; consider using user sessions for production

### Environment Variables
- `PORT` - Server port (default: 5000)
- `CLIENT_URL` - CORS origin for Socket.io (default: http://localhost:3000)
- `NODE_ENV` - Environment mode (development/production)
- `REACT_APP_API_URL` - API URL for React client (default: http://localhost:5000)


