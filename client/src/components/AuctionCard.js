import React, { useState, useEffect } from 'react';
import './AuctionCard.css';

function AuctionCard({ item, onBid, userId, socketId, getServerTime }) {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [bidStatus, setBidStatus] = useState('neutral'); // 'winning', 'outbid', 'neutral'
  const [lastBidValue, setLastBidValue] = useState(item.currentBid);
  const [userHasBid, setUserHasBid] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    // Update countdown every 100ms for smooth display
    const interval = setInterval(() => {
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
    // Check bid status
    const isCurrentlyWinning = item.bidderId === socketId;
    
    if (isCurrentlyWinning) {
      setBidStatus('winning');
      setUserHasBid(true);
    } else if (userHasBid && !isCurrentlyWinning) {
      // User has bid before but is now outbid
      setBidStatus('outbid');
    } else {
      setBidStatus('neutral');
    }
  }, [item.bidderId, userId, socketId, userHasBid]);

  useEffect(() => {
    // Flash animation when bid changes
    if (item.currentBid !== lastBidValue) {
      setLastBidValue(item.currentBid);
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 500);
    }
  }, [item.currentBid, lastBidValue]);

  const formatTime = (ms) => {
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

  const isAuctionEnded = timeRemaining === 0 || timeRemaining === null;
  const hasWinner = item.highestBidder && item.currentBid > item.startingPrice;

  return (
    <>
      <div className={`auction-card ${isFlashing ? 'flash' : ''} ${bidStatus} ${isAuctionEnded ? 'ended' : ''}`}>
        <div className="card-header">
          <h2 className="card-title">{item.title}</h2>
          {!isAuctionEnded && bidStatus === 'winning' && (
            <span className="badge winning-badge">Winning</span>
          )}
          {!isAuctionEnded && bidStatus === 'outbid' && (
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
            <div className={`countdown-timer ${timeRemaining !== null && timeRemaining < 10000 ? 'urgent' : ''} ${isAuctionEnded ? 'ended' : ''}`}>
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>

        <div className="card-footer">
          {!isAuctionEnded ? (
            <button
              className="bid-button"
              onClick={() => onBid(item.id, 10)}
              disabled={isAuctionEnded}
            >
              Bid +$10
            </button>
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
                      {item.highestBidder === userId ? 'You!' : item.highestBidder}
                    </div>
                    {item.highestBidder === userId && (
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
    </>
  );
}

export default AuctionCard;
