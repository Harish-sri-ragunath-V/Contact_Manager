import React, { useEffect, useState } from 'react';

function ContactsApp() {
  const [contacts, setContacts] = useState([]);
  const [authUrl, setAuthUrl] = useState('');

  useEffect(() => {
    fetch('http://localhost:5000/auth-url')
      .then(res => res.json())
      .then(data => setAuthUrl(data.url));
  }, []);

  const fetchContacts = async () => {
    const res = await fetch('http://localhost:5000/contacts', { credentials: 'include' });
    const data = await res.json()
    data.sort((a, b) => a.name.localeCompare(b.name));
    setContacts(data);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>📇 Google Contacts</h2>
      <button onClick={() => window.location.href = authUrl}>Login with Google</button>
      <button onClick={fetchContacts}>Fetch Contacts</button>
      <p style={{ marginTop: '10px' }}>Click "Login with Google" to authenticate, then "Fetch Contacts" to load your contacts.</p>
      <p>email: </p>

      <table border="1" cellPadding="8" style={{ marginTop: '20px', width: '100%' }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((c, i) => (
            <tr key={i}>
              <td>{c.name}</td>
              <td>{c.email}</td>
              <td>{c.phone}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ContactsApp;
