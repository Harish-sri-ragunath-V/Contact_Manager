import React, { useState, useEffect } from 'react';
import './ContactsApp.css';
import Nav from './Nav';
import Dashboard from './Dashboard';
import Groups from './Groups';
import Settings from './Settings';
import Papa from "papaparse";


const ContactsApp = ({ currentUser, onLogout }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSection, setActiveSection] = useState('dashboard');
  const [contacts, setContacts] = useState([]);
  const [showSyncCard, setShowSyncCard] = useState(false);
  const [dataset, setDataset] = useState([]);
  const [newNumber, setNewNumber] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [suggestedName, setSuggestedName] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showLookupModal, setShowLookupModal] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    email: '',
    avatar: '',
    initial: '',
    latitude: '',
    longitude: ''
  });



  useEffect(() => {
    fetch("http://localhost:5000/api/dataset", {
      headers: {
        "user-id": currentUser.id
      },
      credentials: "include"
    })
      .then(res => res.json())
      .then(data => setDataset(data))
      .catch(err => console.error("Error fetching dataset:", err));

  }, []);


  const userId = currentUser.id;

  useEffect(() => {
    fetchContacts();
  }, []);



  const fetchContacts = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/contacts', {
        headers: { 'user-id': currentUser.id },
        credentials: 'include'
      });
      const data = await res.json();
      data.sort((a, b) => a.name.localeCompare(b.name));
      setContacts(data);
    } catch (err) {
      console.error('Error fetching contacts', err);
    }
  };


  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phone.includes(searchTerm)
  );
  // State to indicate syncing
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const syncReady = urlParams.get("sync_ready");

    if (syncReady) {
      // Call backend to import contacts now that session has tokens
      importGoogleContacts();
      window.history.replaceState({}, "", "/contacts"); // clean URL
    }
  }, []);

  const importGoogleContacts = async () => {
    try {
      setIsSyncing(true);

      const res = await fetch("http://localhost:5000/contacts/import-google", {
        method: "POST",
        headers: { "user-id": currentUser.id },
        credentials: "include"
      });

      const data = await res.json();

      if (res.ok) {
        // Add imported contacts to state
        setContacts(prev => [...prev, ...data.added]);
        alert(`Imported ${data.addedCount} contacts from Google`);
      } else {
        alert(data.error || "Failed to import contacts");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };


  const handleSyncGoogleContacts = async () => {
    try {
      setIsSyncing(true);
      const res = await fetch("http://localhost:5000/auth-url", {
        headers: { "user-id": userId },
        credentials: "include"
      });
      const data = await res.json();

      // Open Google OAuth in same window
      window.location.href = data.url;
    } catch (err) {
      console.error("Error starting Google OAuth:", err);
      setIsSyncing(false);
    }
  };


  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async function (results) {
        const contactsFromCSV = results.data;

        for (const c of contactsFromCSV) {
          await fetch("http://localhost:5000/api/contacts", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "user-id": userId
            },
            body: JSON.stringify({
              name: c.name,
              phone: c.phone,
              email: c.email,
              avatar: "",
              initial: c.name.charAt(0).toUpperCase(),
              latitude: "",
              longitude: ""
            })
          });
        }

        alert("CSV Contacts Imported Successfully!");
        setShowSyncCard(false);
      }
    });
  };
  const handleExportCSV = () => {
    if (contacts.length === 0) {
      alert("No contacts available to export.");
      return;
    }

    // Convert contacts to CSV format
    const csvData = contacts.map((c) => ({
      name: c.name,
      phone: c.phone,
      email: c.email || "",
      type: c.type || "",
      latitude: c.location?.coordinates?.[1] || "",
      longitude: c.location?.coordinates?.[0] || ""
    }));


    const csv = Papa.unparse(csvData);

    // Create downloadable file
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "contacts_export.csv";
    link.click();

    URL.revokeObjectURL(url);
  };


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
      const contactData = {
        ...newContact,
        type: newContact.type || "Personal",
        location: (newContact.latitude && newContact.longitude) ? {
          lat: parseFloat(newContact.latitude),
          lng: parseFloat(newContact.longitude)
        } : undefined
      };

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
        body: JSON.stringify(contactData)
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
        setNewContact({ name: '', phone: '', email: '', avatar: '', initial: '', latitude: '', longitude: '' });
      } else {
        alert(data.message || 'Failed to save contact');
      }
    } catch (error) {
      console.error('Error saving contact:', error);
    }
  };

  const handleSearchNewNumber = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/dataset/${newNumber}`, {
        headers: { "user-id": userId }
      });


      if (res.ok) {
        const contact = await res.json();
        setLookupResult({ found: true, name: contact.name });
      } else {
        setLookupResult({ found: false });
      }

      setShowLookupModal(true); // 👈 open modal after search
    } catch (err) {
      console.error("Error searching number:", err);
    }
  };

  const handleSaveSuggestedName = async () => {
    if (!suggestedName.trim()) return;
    try {
      const res = await fetch("http://localhost:5000/api/dataset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "user-id": currentUser.id
        },
        body: JSON.stringify({ phone: newNumber, name: suggestedName }),
      });

      const data = await res.json();
      if (res.ok) {
        setDataset([...dataset, data.contact]);
        setLookupResult({ found: true, name: suggestedName });
        setSuggestedName("");
        setNewNumber("");
        alert("New number added successfully!");
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err) {
      console.error("Error saving number:", err);
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
        <div className="contact-actions">
          <a href={`tel:${contact.phone}`} className="call-btn">
            <i className="fa fa-phone"></i>
          </a>
        </div>
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
              <div className="search-bar">

                <input
                  type="tel"
                  placeholder="Search new numbers"
                  value={newNumber}
                  minLength={10}
                  maxLength={10}
                  pattern="\d{10}"
                  onChange={(e) => setNewNumber(e.target.value.replace(/\D/, ''))}
                />
                <button
                  onClick={() => {
                    if (newNumber.length === 10) {
                      handleSearchNewNumber();
                    } else {
                      alert('Please enter a valid 10-digit number');
                    }
                  }}
                >
                  <i className="fas fa-search"></i>
                </button>

                {showLookupModal && (
                  <div className='modal-overlay'>
                    <div className="modal">
                      <div className="modal-content">
                        <span className="close" onClick={() => setShowLookupModal(false)}>
                          &times;
                        </span>

                        {lookupResult?.found ? (
                          <div>
                            <h2>📞 Number Found</h2>
                            <p><strong>{newNumber}</strong></p>
                            <p>👤 Belongs to: <strong>{lookupResult.name}</strong></p>

                            {/* Add Contact Button */}
                            <button
                              className="primary"
                              onClick={() => {
                                setNewContact({
                                  name: lookupResult.name,
                                  phone: newNumber,
                                  email: '',
                                  avatar: '',
                                  initial: lookupResult.name.charAt(0).toUpperCase()
                                });
                                setShowAddContactModal(true); // open Add/Edit modal
                                setShowLookupModal(false); // close lookup modal
                              }}
                            >
                              Add to Contacts
                            </button>
                          </div>
                        ) : (
                          <div className="not-found-box">
                            <h2>📞 Number Not Found</h2>
                            <p><strong>{newNumber}</strong></p>
                            <p>Suggest a name:</p>
                            <input
                              type="text"
                              placeholder="Enter name"
                              value={suggestedName}
                              onChange={(e) => setSuggestedName(e.target.value)}
                            />
                            <button onClick={handleSaveSuggestedName}>Save</button>
                          </div>
                        )}

                      </div>
                    </div>
                  </div>
                )}

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
              <button className="sync-btn" onClick={() => setShowSyncCard(true)}>
                <i class="fa-solid fa-file-import"></i> Import
              </button>
              <button className="sync-btn" onClick={handleExportCSV}>
                <i class="fa-solid fa-file-export"></i> Export
              </button>

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
            {showSyncCard && (
              <div className="modal-overlay">
                <div className="sync-card modal">
                  <div className="modal-header">
                    <h2>Import Contacts</h2>
                    <button
                      className="close-btn"
                      onClick={() => setShowSyncCard(false)}
                    >
                      <i className="fa-solid fa-times"></i>
                    </button>
                  </div>
                  <div className="sync-actions">
                    {/* Google Sync */}
                    <button
                      className="google-sync-btn"
                      onClick={handleSyncGoogleContacts}
                      disabled={isSyncing}
                    >
                      {isSyncing ? 'Syncing...' : <><i className="fa-brands fa-google"></i> Sync Google</>}
                    </button>

                    {/* CSV Upload */}
                    <input
                      type="file"
                      accept=".csv"
                      id="csvUpload"
                      style={{ display: "none" }}
                      onChange={handleCSVUpload}
                    />
                    <button
                      className="csv-btn"
                      onClick={() => document.getElementById("csvUpload").click()}
                    >
                      <i class="fa-solid fa-file-import"></i>Upload CSV File
                    </button>
                  </div>

                  {isSyncing && (
                    <p style={{ marginTop: '10px', textAlign: 'center' }}>Fetching contacts from Google...</p>
                  )}
                </div>
              </div>
            )}

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
            <div className="user-initial">
              {currentUser.username.charAt(0).toUpperCase()}
            </div>
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
            {activeSection === 'settings' && 'Profile'}
          </h1>
          <div className="user-profile">
            <div className="user-initial">
              {currentUser.username.charAt(0).toUpperCase()}
            </div>
            <span>{currentUser.username}</span>
          </div>
        </header>

        {isSidebarOpen && (
          <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)}></div>
        )}

        {renderContent()}
      </div>

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
                  minLength={10}
                  maxLength={10}
                  pattern="\d+"
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
              <div className="form-group">
                <label>Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={newContact.latitude}
                  onChange={(e) => setNewContact({ ...newContact, latitude: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div className="form-group">
                <label>Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={newContact.longitude}
                  onChange={(e) => setNewContact({ ...newContact, longitude: e.target.value })}
                  placeholder="Optional"
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