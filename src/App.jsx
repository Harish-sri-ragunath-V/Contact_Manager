import React, { useState, useEffect } from 'react';
import ContactsApp from './ContactsApp';
import Login from './Login';
import Register from './Register';
// import ContactsAppg from './ContactsAppg';
import './App.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState('login');

  // Check if user is already logged in
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('emergencyContacts');
    setCurrentView('login');
  };

  const switchToRegister = () => setCurrentView('register');
  const switchToLogin = () => setCurrentView('login');

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">
          <i className="fa-solid fa-spinner fa-spin"></i>
        </div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <>
      {currentUser ? (
        <ContactsApp currentUser={currentUser} onLogout={handleLogout} />
      ) : (
        <>
          {currentView === 'login' ? (
            <Login onLogin={handleLogin} onSwitchToRegister={switchToRegister} />
          ) : (
            <Register onRegister={handleLogin} onSwitchToLogin={switchToLogin} />
          )}
        </>
      )}
      {/* <ContactsAppg/> */}
    </>
  );
}

export default App;