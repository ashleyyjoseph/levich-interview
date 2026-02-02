import React, { useState } from 'react';
import './NameInput.css';

function NameInput({ onNameSubmit }) {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onNameSubmit(name.trim());
    }
  };

  return (
    <div className="name-input-container">
      <div className="name-input-card">
        <h1>Welcome to Live Bidding Platform</h1>
        <p>Please enter your name to continue</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="name-input-field"
            autoFocus
            required
          />
          <button type="submit" className="name-submit-button">
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}

export default NameInput;
