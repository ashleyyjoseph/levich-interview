import React, { useState, useEffect, useMemo } from 'react';
import './AuctionCard.css';

function AuctionCard({ item, onBid, userName, socketId, getServerTime, userBids = {} }) {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [bidStatus, setBidStatus] = useState('neutral'); // 'winning', 'outbid', 'neutral'
  const [lastBidValue, setLastBidValue] = useState(item.currentBid);
  const [userHasBid, setUserHasBid] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showBidsList, setShowBidsList] = useState(false);

  useEffect(() => {
    // Update countdown every 100ms for smooth display
    const interval = setInterval(() => {
      // Check if auction has started
      if (!item.auctionEndTime) {
        setTimeRemaining(null);
        return;
      }
      
      const now = getServerTime();
      const remaining = Math.max(0, item.auctionEndTime - now);
      setTimeRemaining(remaining);

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [item.auctionEndTime, getServerTime]);

  useEffect(() => {
    // Check bid status based on highest bidder name
    const isCurrentlyWinning = item.highestBidder === userName;
    const hasUserBids = userBids[userName] && userBids[userName].length > 0;
    
    if (hasUserBids) {
      setUserHasBid(true);
    }
    
    if (isCurrentlyWinning) {
      setBidStatus('winning');
    } else if (userHasBid && !isCurrentlyWinning) {
      // User has bid before but is now outbid
      setBidStatus('outbid');
    } else {
      setBidStatus('neutral');
    }
  }, [item.highestBidder, userName, userHasBid, userBids]);

  useEffect(() => {
    // Flash animation when bid changes
    if (item.currentBid !== lastBidValue) {
      setLastBidValue(item.currentBid);
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 500);
    }
  }, [item.currentBid, lastBidValue]);

  const formatTime = (ms) => {
    // Check if auction hasn't started
    if (ms === null || ms === undefined) return 'Not Started';
    if (ms <= 0) return 'Auction Ended';
    
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 100);

    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds}`;
    }
    return `${seconds}.${milliseconds.toString().padStart(1, '0')}`;
  };

  const isAuctionNotStarted = !item.auctionEndTime;
  const isAuctionEnded = item.auctionEndTime && timeRemaining === 0;
  const hasWinner = item.highestBidder && item.currentBid > item.startingPrice;
  
  // Calculate user bids data - ensure we handle the structure correctly and recalculate when userBids or userName changes
  // Total Bid Amount shows the highest bid amount (not the sum of all bids)
  const { userBidsList, totalUserBids, userTotalBidAmount } = useMemo(() => {
    if (!userBids || typeof userBids !== 'object') {
      return { userBidsList: [], totalUserBids: 0, userTotalBidAmount: 0 };
    }
    const bidsList = Array.isArray(userBids[userName]) ? userBids[userName] : [];
    const total = bidsList.length;
    // Calculate total as the highest bid amount (not sum of all bids)
    // This represents the user's actual commitment/liability
    // Handle both old format (number) and new format (object with amount and timestamp)
    const amount = bidsList.length > 0 
      ? Math.max(...bidsList.map(bid => {
          if (typeof bid === 'number') {
            return bid;
          } else if (bid && typeof bid === 'object' && bid.amount) {
            return parseFloat(bid.amount) || 0;
          }
          return parseFloat(bid) || 0;
        }))
      : 0;
    return { userBidsList: bidsList, totalUserBids: total, userTotalBidAmount: amount };
  }, [userBids, userName]);

  // Format timestamp with milliseconds
  const formatBidTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
  };

  return (
    <>
      <div className={`auction-card ${isFlashing ? 'flash' : ''} ${bidStatus} ${isAuctionEnded ? 'ended' : ''} ${isAuctionNotStarted ? 'not-started' : ''}`}>
        <div className="card-header">
          <h2 className="card-title">{item.title}</h2>
          {isAuctionNotStarted && (
            <span className="badge not-started-badge">Not Started</span>
          )}
          {!isAuctionNotStarted && !isAuctionEnded && bidStatus === 'winning' && (
            <span className="badge winning-badge">Winning</span>
          )}
          {!isAuctionNotStarted && !isAuctionEnded && bidStatus === 'outbid' && (
            <span className="badge outbid-badge">Outbid</span>
          )}
          {isAuctionEnded && (
            <span className="badge ended-badge">Ended</span>
          )}
        </div>
        
        <div className="card-body">
          <div className="price-section">
            <div className="price-label">{isAuctionEnded ? 'Final Bid' : 'Current Bid'}</div>
            <div className="price-value">${item.currentBid.toFixed(2)}</div>
            <div className="starting-price">Starting: ${item.startingPrice.toFixed(2)}</div>
          </div>

          <div className="countdown-section">
            <div className="countdown-label">Time Remaining</div>
            <div className={`countdown-timer ${isAuctionNotStarted ? 'not-started' : ''} ${timeRemaining !== null && timeRemaining < 10000 && !isAuctionNotStarted ? 'urgent' : ''} ${isAuctionEnded ? 'ended' : ''}`}>
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>

        <div className="card-footer">
          {isAuctionNotStarted ? (
            <div className="not-started-message">Auction has not started yet</div>
          ) : !isAuctionEnded ? (
            <>
              <button
                className="bid-button"
                onClick={() => onBid(item.id, 10)}
                disabled={isAuctionEnded}
              >
                Bid +$10
              </button>
              {totalUserBids > 0 && (
                <button
                  className="bids-list-button"
                  onClick={() => setShowBidsList(true)}
                >
                  Your Bids ({totalUserBids})
                </button>
              )}
            </>
          ) : (
            <button
              className="results-button"
              onClick={() => setShowResults(true)}
            >
              View Results
            </button>
          )}
        </div>
      </div>

      {showResults && (
        <div className="results-modal-overlay" onClick={() => setShowResults(false)}>
          <div className="results-modal" onClick={(e) => e.stopPropagation()}>
            <div className="results-modal-header">
              <h2>Auction Results: {item.title}</h2>
              <button className="close-button" onClick={() => setShowResults(false)}>×</button>
            </div>
            <div className="results-modal-body">
              {hasWinner ? (
                <>
                  <div className="result-section">
                    <div className="result-label">Winner</div>
                    <div className="result-value winner-name">
                      {item.highestBidder === userName ? 'You!' : item.highestBidder}
                    </div>
                    {item.highestBidder === userName && (
                      <div className="congratulations">🎉 Congratulations! 🎉</div>
                    )}
                  </div>
                  <div className="result-section">
                    <div className="result-label">Final Bid</div>
                    <div className="result-value final-bid">${item.currentBid.toFixed(2)}</div>
                  </div>
                  <div className="result-section">
                    <div className="result-label">Starting Price</div>
                    <div className="result-value">${item.startingPrice.toFixed(2)}</div>
                  </div>
                </>
              ) : (
                <div className="no-winner">
                  <div className="result-label">No Bids Placed</div>
                  <div className="result-value">This auction ended without any bids.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showBidsList && (
        <div className="results-modal-overlay" onClick={() => setShowBidsList(false)}>
          <div className="results-modal" onClick={(e) => e.stopPropagation()}>
            <div className="results-modal-header">
              <h2>Your Bids: {item.title}</h2>
              <button className="close-button" onClick={() => setShowBidsList(false)}>×</button>
            </div>
            <div className="results-modal-body">
              {totalUserBids > 0 ? (
                <>
                  <div className="result-section">
                    <div className="result-label">Total Bids Placed</div>
                    <div className="result-value">{totalUserBids}</div>
                  </div>
                  <div className="result-section">
                    <div className="result-label">Total Bid Amount</div>
                    <div className="result-value">${userTotalBidAmount.toFixed(2)}</div>
                  </div>
                  <div className="bids-list-section">
                    <div className="result-label">Your Bid History</div>
                    <div className="bids-list">
                      {userBidsList.map((bid, index) => {
                        // Handle both old format (number) and new format (object with amount and timestamp)
                        const bidAmount = typeof bid === 'number' ? bid : (bid && bid.amount ? bid.amount : bid);
                        const bidTimestamp = typeof bid === 'object' && bid.timestamp ? bid.timestamp : null;
                        return (
                          <div key={index} className="bid-item">
                            <span className="bid-number">#{index + 1}</span>
                            <span className="bid-amount">${typeof bidAmount === 'number' ? bidAmount.toFixed(2) : parseFloat(bidAmount).toFixed(2)}</span>
                            {bidTimestamp && (
                              <span className="bid-time">{formatBidTime(bidTimestamp)}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="no-bids">
                  <div className="result-label">No Bids Yet</div>
                  <div className="result-value">You haven't placed any bids on this item.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AuctionCard;
