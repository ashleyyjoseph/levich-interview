import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import AuctionCard from './AuctionCard';
import './Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function Dashboard() {
  const [items, setItems] = useState([]);
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  const [userId] = useState(() => `user_${Math.random().toString(36).substr(2, 9)}`);
  const [socketId, setSocketId] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // Fetch initial items
    fetchItems();
    
    // Sync server time
    syncServerTime();
    const timeSyncInterval = setInterval(syncServerTime, 30000); // Sync every 30 seconds

    // Create socket connection
    const socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000
    });

    socketRef.current = socket;

    // Socket connection handlers
    socket.on('connect', () => {
      setSocketId(socket.id);
      console.log('Connected to server:', socket.id);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setSocketId(null);
    });

    socket.on('items_update', (updatedItems) => {
      setItems(updatedItems);
    });

    socket.on('UPDATE_BID', (bidData) => {
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === bidData.itemId
            ? {
                ...item,
                currentBid: bidData.currentBid,
                highestBidder: bidData.highestBidder,
                bidderId: bidData.bidderId,
                lastUpdateTime: Date.now()
              }
            : item
        )
      );
    });

    socket.on('server_time', (data) => {
      const clientTime = Date.now();
      setServerTimeOffset(data.serverTime - clientTime);
    });

    socket.on('bid_success', (data) => {
      console.log('Bid successful:', data);
    });

    socket.on('bid_error', (error) => {
      console.error('Bid error:', error);
      alert(error.message || 'Failed to place bid');
    });

    return () => {
      clearInterval(timeSyncInterval);
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const fetchItems = async () => {
    try {
      const response = await axios.get(`${API_URL}/items`);
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const syncServerTime = async () => {
    try {
      const startTime = Date.now();
      const response = await axios.get(`${API_URL}/server-time`);
      const endTime = Date.now();
      const roundTripTime = endTime - startTime;
      const serverTime = response.data.serverTime;
      // Account for half the round trip time
      setServerTimeOffset(serverTime - endTime + roundTripTime / 2);
    } catch (error) {
      console.error('Error syncing server time:', error);
    }
  };

  const handleBid = (itemId, increment = 10) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    if (!socketRef.current || !socketRef.current.connected) {
      alert('Not connected to server. Please wait for connection.');
      return;
    }

    const newBid = item.currentBid + increment;
    socketRef.current.emit('BID_PLACED', {
      itemId,
      bidAmount: newBid,
      userId
    });
  };

  const getServerTime = () => {
    return Date.now() + serverTimeOffset;
  };

  return (
    <div className="dashboard">
      <div className="dashboard-grid">
        {items.map(item => (
          <AuctionCard
            key={item.id}
            item={item}
            onBid={handleBid}
            userId={userId}
            socketId={socketId}
            getServerTime={getServerTime}
          />
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
