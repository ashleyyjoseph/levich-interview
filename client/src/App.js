import React from 'react';
import './App.css';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Live Bidding Platform</h1>
        <p>Real-time auction marketplace</p>
      </header>
      <Dashboard />
    </div>
  );
}

export default App;
