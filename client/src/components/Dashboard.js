import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import AuctionCard from './AuctionCard';
import { useToast } from '../contexts/ToastContext';
import './Dashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function Dashboard({ userName }) {
  const [items, setItems] = useState([]);
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  const [socketId, setSocketId] = useState(null);
  const [userBids, setUserBids] = useState({}); // { itemId: { userName: [bids] } }
  const socketRef = useRef(null);
  const toast = useToast();

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
      // Fetch user bids for all items
      updatedItems.forEach(item => {
        fetchUserBids(item.id);
      });
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
      // Refresh user bids for this item
      fetchUserBids(bidData.itemId);
    });

    socket.on('server_time', (data) => {
      const clientTime = Date.now();
      setServerTimeOffset(data.serverTime - clientTime);
    });

    socket.on('bid_success', (data) => {
      console.log('Bid successful:', data);
      // Refresh user bids after successful bid
      fetchUserBids(data.itemId);
    });

    socket.on('bid_error', (error) => {
      console.error('Bid error:', error);
      toast.error(error.message || 'Failed to place bid');
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

  const fetchUserBids = async (itemId) => {
    try {
      const response = await axios.get(`${API_URL}/items/${itemId}/bids`);
      if (response.data.success) {
        setUserBids(prev => ({
          ...prev,
          [itemId]: response.data.userBids
        }));
      }
    } catch (error) {
      console.error('Error fetching user bids:', error);
    }
  };

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
      toast.warning('Not connected to server. Please wait for connection.');
      return;
    }

    const newBid = item.currentBid + increment;
    socketRef.current.emit('BID_PLACED', {
      itemId,
      bidAmount: newBid,
      userName
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
            userName={userName}
            socketId={socketId}
            getServerTime={getServerTime}
            userBids={userBids[item.id] || {}}
          />
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
