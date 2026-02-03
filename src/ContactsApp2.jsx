import React, { useState, useEffect } from 'react';
import './ContactsApp.css';
import Nav from './Nav';
import Dashboard from './Dashboard';
import Groups from './Groups';
import Settings from './Settings';

const ContactsApp = ({ currentUser, onLogout }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSection, setActiveSection] = useState('dashboard');
  const [contacts, setContacts] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    email: '',
    avatar: '',
    initial: ''
  });

  const userId = currentUser.id;

  useEffect(() => {
    if (activeSection === 'contacts') {
      fetchContacts();
    }
  }, [activeSection]);

  const fetchContacts = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/contacts', {
        headers: {
          'user-id': userId
        }
      });
      const data = await response.json();
      setContacts(data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phone.includes(searchTerm)
  );

  const handleDeleteContact = async (id) => {
    try {
      const response = await fetch(`http://localhost:5000/api/contacts/${id}`, {
        method: 'DELETE',
        headers: {
          'user-id': userId
        }
      });

      if (response.ok) {
        setContacts(contacts.filter(contact => contact._id !== id));
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
    }
  };

  const handleEditContact = (contact) => {
    setNewContact(contact);
    setShowAddContactModal(true);
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    try {
      const method = newContact._id ? 'PUT' : 'POST';
      const url = newContact._id
        ? `http://localhost:5000/api/contacts/${newContact._id}`
        : 'http://localhost:5000/api/contacts';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'user-id': userId
        },
        body: JSON.stringify(newContact)
      });
      const data = await response.json();
      if (response.ok) {
        const contact = data;
        if (newContact._id) {
          setContacts(contacts.map(c => c._id === contact._id ? contact : c));
        } else {
          setContacts([...contacts, contact]);
        }
        setShowAddContactModal(false);
        setNewContact({ name: '', phone: '', email: '', avatar: '', initial: '' });
      } else {
        if (response.status === 400 && data.message.includes('Phone number already exists')) {
          alert(`Error: ${data.message}${data.existingContact ? ` - Existing contact: ${data.existingContact.name}` : ''}`);
        } else if (response.status === 400 && data.message.includes('Name already exists')) {
          alert(`Error: ${data.message}${data.existingContact ? ` - Existing contact: ${data.existingContact.phone}` : ''}`);
        }
        else {
          alert(`Error: ${data.message || 'Failed to save contact'}`);
        }
      }
    } catch (error) {
      console.error('Error saving contact:', error);
    }
  };

  const ContactItem = ({ contact }) => (
    <div className="contact-item">
      <div className="contact-info">
        {contact.avatar ? (
          <img src={contact.avatar} alt={contact.name} className="contact-avatar" />
        ) : (
          <div className="contact-initial">
            {contact.initial || contact.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="contact-details">
          <h3>{contact.name}</h3>
          <p>{contact.phone}</p>
          {contact.email && <p className="contact-email">{contact.email}</p>}
        </div>
      </div>
      <div className="contact-actions">
        <button onClick={() => handleEditContact(contact)}>
          <i className='fas fa-edit'></i>
        </button>
        <button className="delete" onClick={() => handleDeleteContact(contact._id)}>
          <i className="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard contacts={contacts} currentUser={currentUser} />;
      case 'groups':
        return <Groups contacts={contacts} currentUser={currentUser} />;
      case 'settings':
        return <Settings currentUser={currentUser} onLogout={onLogout} />;
      case 'contacts':
      default:
        return (
          <>
            <div className="top-bar">
              <div className="search-bar">
                <span className="search-icon"><i className="fas fa-search"></i></span>
                <input
                  type="search"
                  placeholder="Search contacts"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className='add-contact'>
                <button
                  className="add-contact-button"
                  onClick={() => {
                    setNewContact({ name: '', phone: '', email: '', avatar: '', initial: '' });
                    setShowAddContactModal(true);
                  }}
                >
                  <i className="fa-solid fa-plus"></i>
                </button>
              </div>
            </div>

            <div className="contact-list">
              {filteredContacts.length > 0 ? (
                filteredContacts.map((contact) => (
                  <ContactItem key={contact._id} contact={contact} />
                ))
              ) : (
                <div className="empty-state">
                  <div style={{ fontSize: '48px' }}>📭</div>
                  <p>No contacts found</p>
                </div>
              )}
            </div>
          </>
        );
    }
  };

  return (
    <div className="app-container">
      <div className={`sidebar${isSidebarOpen ? ' open' : ''}`}>
        <button
          className="toggle-box"
          style={{ alignSelf: 'flex-end' }}
          onClick={() => setIsSidebarOpen(false)}
        >
          <span style={{ fontSize: '1rem' }}>&#10006;</span>
        </button>
        <div className="sidebar-header">
          <div className="sidebar-logo desktop-only"><i className="fa-solid fa-user"></i></div>
          <div className="user-profile mobile-only">
            <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face" alt={currentUser.username} />
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{currentUser.username}</span>
          </div>
        </div>
        <Nav activeSection={activeSection} setActiveSection={setActiveSection} />
        {/* Add logout button to sidebar for desktop */}
        <button onClick={onLogout} className="nav-button logout-btn">
          <i className="fa-solid fa-sign-out-alt"></i>
          <span>Logout</span>
        </button>
      </div>

      <div className="main">
        <header className="header">
          {!isSidebarOpen && (
            <button
              className="toggle-box"
              style={{ marginRight: 16 }}
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open navigation menu"
              id="mobile-toggle-btn"
            >
              <span style={{ fontSize: '1.5rem' }}>&#9776;</span>
            </button>
          )}
          <h1>
            {activeSection === 'dashboard' && 'Dashboard'}
            {activeSection === 'contacts' && 'Contacts'}
            {activeSection === 'groups' && 'Groups'}
            {activeSection === 'settings' && 'Settings'}
          </h1>
          <div className="user-profile">
            <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face" alt={currentUser.username} />
            <span>{currentUser.username}</span>
          </div>
        </header>

        {isSidebarOpen && (
          <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)}></div>
        )}

        {renderContent()}
      </div>

      {/* Add/Edit Contact Modal */}
      {showAddContactModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{newContact._id ? 'Edit Contact' : 'Add New Contact'}</h3>
              <button
                className="close-btn"
                onClick={() => setShowAddContactModal(false)}
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleAddContact}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone *</label>
                <input
                  type="tel"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Type</label>
                <input
                  type="text"
                  value={newContact.type}
                  onChange={(e) => setNewContact({ ...newContact, type: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddContactModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary">
                  {newContact._id ? 'Update Contact' : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactsApp;