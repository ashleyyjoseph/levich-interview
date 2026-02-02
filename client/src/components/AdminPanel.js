import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { useToast } from '../contexts/ToastContext';
import './AdminPanel.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function AdminPanel({ userName }) {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({
    title: '',
    startingPrice: '',
    duration: '' // in minutes
  });
  const [socketRef, setSocketRef] = useState(null);
  const toast = useToast();

  useEffect(() => {
    // Fetch initial items
    fetchItems();

    // Create socket connection for real-time updates
    const socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true
    });

    setSocketRef(socket);

    socket.on('items_update', (updatedItems) => {
      setItems(updatedItems);
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const fetchItems = async () => {
    try {
      const response = await axios.get(`${API_URL}/items`);
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Failed to fetch items');
    }
  };

  const handleCreateItem = async (e) => {
    e.preventDefault();
    
    if (!newItem.title || !newItem.startingPrice || !newItem.duration) {
      toast.warning('Please fill in all fields');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/admin/items`, {
        title: newItem.title,
        startingPrice: parseFloat(newItem.startingPrice),
        duration: parseInt(newItem.duration)
      });

      if (response.data.success) {
        setNewItem({ title: '', startingPrice: '', duration: '' });
        fetchItems();
        toast.success('Item created successfully!');
      }
    } catch (error) {
      console.error('Error creating item:', error);
      toast.error(error.response?.data?.error || 'Failed to create item');
    }
  };

  const handleStartAuction = async (itemId) => {
    try {
      const response = await axios.post(`${API_URL}/admin/items/${itemId}/start`);
      
      if (response.data.success) {
        fetchItems();
        toast.success('Auction started successfully!');
      }
    } catch (error) {
      console.error('Error starting auction:', error);
      toast.error(error.response?.data?.error || 'Failed to start auction');
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Not started';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const isAuctionActive = (item) => {
    return item.auctionEndTime && Date.now() < item.auctionEndTime;
  };

  const isAuctionEnded = (item) => {
    return item.auctionEndTime && Date.now() >= item.auctionEndTime;
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <p>Welcome, {userName}</p>
      </div>

      <div className="admin-content">
        <div className="admin-section">
          <h2>Create New Auction Item</h2>
          <form onSubmit={handleCreateItem} className="create-item-form">
            <div className="form-group">
              <label>Item Title</label>
              <input
                type="text"
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                placeholder="Enter item title"
                required
              />
            </div>
            <div className="form-group">
              <label>Starting Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newItem.startingPrice}
                onChange={(e) => setNewItem({ ...newItem, startingPrice: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
            <div className="form-group">
              <label>Duration (minutes)</label>
              <input
                type="number"
                min="1"
                value={newItem.duration}
                onChange={(e) => setNewItem({ ...newItem, duration: e.target.value })}
                placeholder="Enter duration in minutes"
                required
              />
            </div>
            <button type="submit" className="create-button">
              Create Item
            </button>
          </form>
        </div>

        <div className="admin-section">
          <h2>Manage Auctions</h2>
          <div className="items-list">
            {items.length === 0 ? (
              <p className="no-items">No items created yet</p>
            ) : (
              items.map(item => (
                <div key={item.id} className="admin-item-card">
                  <div className="item-info">
                    <h3>{item.title}</h3>
                    <div className="item-details">
                      <p><strong>Starting Price:</strong> ${item.startingPrice.toFixed(2)}</p>
                      <p><strong>Current Bid:</strong> ${item.currentBid.toFixed(2)}</p>
                      <p><strong>Highest Bidder:</strong> {item.highestBidder || 'None'}</p>
                      <p><strong>Status:</strong> {
                        !item.auctionEndTime ? 'Not Started' :
                        isAuctionActive(item) ? 'Active' :
                        isAuctionEnded(item) ? 'Ended' : 'Not Started'
                      }</p>
                      {item.auctionEndTime && (
                        <p><strong>End Time:</strong> {formatTime(item.auctionEndTime)}</p>
                      )}
                    </div>
                  </div>
                  <div className="item-actions">
                    {!item.auctionEndTime ? (
                      <button
                        onClick={() => handleStartAuction(item.id)}
                        className="start-button"
                      >
                        Start Auction
                      </button>
                    ) : isAuctionActive(item) ? (
                      <span className="status-badge active">Auction Active</span>
                    ) : (
                      <span className="status-badge ended">Auction Ended</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
