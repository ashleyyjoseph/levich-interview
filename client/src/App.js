import React, { useState } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
import NameInput from './components/NameInput';
import { ToastProvider } from './contexts/ToastContext';

function App() {
  const [userName, setUserName] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const handleNameSubmit = (name) => {
    setUserName(name);
    setIsAdmin(name.toLowerCase() === 'admin');
  };

  if (!userName) {
    return (
      <ToastProvider>
        <NameInput onNameSubmit={handleNameSubmit} />
      </ToastProvider>
    );
  }

  if (isAdmin) {
    return (
      <ToastProvider>
        <div className="App">
          <AdminPanel userName={userName} />
        </div>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <div className="App">
        <header className="App-header">
          <h1>Live Bidding Platform</h1>
          <p>Welcome, {userName}</p>
        </header>
        <Dashboard userName={userName} />
      </div>
    </ToastProvider>
  );
}

export default App;
