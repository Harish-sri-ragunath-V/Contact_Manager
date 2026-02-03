import React, { useState, useEffect } from 'react';
import './ContactsApp.css';

const Groups = ({ contacts, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [groups, setGroups] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [showGroupDetailsModal, setShowGroupDetailsModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: ''
  });
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [contactSearchTerm, setContactSearchTerm] = useState('');


  const userId = currentUser.id;

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/groups', {
        headers: {
          'user-id': userId
        }
      });
      const data = await response.json();
      setGroups(data);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': userId
        },
        body: JSON.stringify({
          ...newGroup,
          members: selectedContacts
        })
      });

      const group = await response.json();
      if (response.ok) {
        setGroups([...groups, group]);
        setShowCreateModal(false);
        setNewGroup({ name: '', description: '' });
        setSelectedContacts([]);
      } else {
        alert(`Error: ${group.message}`);
      }
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  const handleAddMembers = (group) => {
    setSelectedGroup(group);
    setSelectedContacts([]);
    setShowAddMembersModal(true);
  };

  const handleAddMembersSubmit = async (e) => {
    e.preventDefault();
    try {
      const allMembers = [...selectedGroup.members.map(m => m._id), ...selectedContacts];
      const response = await fetch(`http://localhost:5000/api/groups/${selectedGroup._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'user-id': userId
        },
        body: JSON.stringify({
          members: allMembers
        })
      });

      if (response.ok) {
        const updatedGroup = await response.json();
        setGroups(groups.map(g => g._id === updatedGroup._id ? updatedGroup : g));
        setShowAddMembersModal(false);
        setSelectedGroup(null);
        setSelectedContacts([]);
      }
    } catch (error) {
      console.error('Error adding members:', error);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (window.confirm('Are you sure you want to delete this group?')) {
      try {
        const response = await fetch(`http://localhost:5000/api/groups/${groupId}`, {
          method: 'DELETE',
          headers: {
            'user-id': userId
          }
        });

        if (response.ok) {
          setGroups(groups.filter(group => group._id !== groupId));
        }
      } catch (error) {
        console.error('Error deleting group:', error);
      }
    }
  };

  const handleViewGroup = (group) => {
    setSelectedGroup(group);
    setShowGroupDetailsModal(true);
  };

  const handleRemoveContact = async (contactId) => {
    if (window.confirm('Are you sure you want to remove this contact from the group?')) {
      try {
        const updatedMembers = selectedGroup.members
          .filter(member => member._id !== contactId)
          .map(member => member._id);

        const response = await fetch(`http://localhost:5000/api/groups/${selectedGroup._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'user-id': userId
          },
          body: JSON.stringify({
            members: updatedMembers
          })
        });

        if (response.ok) {
          const updatedGroup = await response.json();
          setGroups(groups.map(g => g._id === updatedGroup._id ? updatedGroup : g));
          setSelectedGroup(updatedGroup); // Update the selected group in state
        }
      } catch (error) {
        console.error('Error removing contact from group:', error);
      }
    }
  };

  const toggleContactSelection = (contactId) => {
    setSelectedContacts(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const GroupItem = ({ group }) => (
    <div className="group-item" onClick={() => handleViewGroup(group)}>
      <div className="group-info">
        <div className="group-avatar">
          <i className="fa-solid fa-users"></i>
        </div>
        <div className="group-details">
          <h3>{group.name}</h3>
          <p>{group.members.length} members</p>
          {group.description && <p className="group-description">{group.description}</p>}
        </div>
      </div>
      <div className="group-actions" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => handleAddMembers(group)}
          className="add-members-btn"
        >
          <i className="fa-solid fa-user-plus"></i> Add Members
        </button>
        <button
          className="delete-group-btn"
          onClick={() => handleDeleteGroup(group._id)}
        >
          <i className="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>
  );
  return (
    <div className="groups">
      <div className="top-bar">
        <div className="search-bar">
          <span className="search-icon"><i className="fas fa-search"></i></span>
          <input
            type="search"
            placeholder="Search groups"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className='add-contact'>
          <button
            className="add-contact-button"
            onClick={() => setShowCreateModal(true)}
          >
            <i className="fa-solid fa-plus"></i>
          </button>
        </div>
      </div>

      <div className="groups-list">
        {filteredGroups.length > 0 ? (
          filteredGroups.map((group) => (
            <GroupItem key={group._id} group={group} />
          ))
        ) : (
          <div className="empty-state">
            <div style={{ fontSize: '48px' }}>👥</div>
            <p>No groups found</p>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Create New Group</h3>
              <button
                className="close-btn"
                onClick={() => setShowCreateModal(false)}
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleCreateGroup}>
              <div className="form-group">
                <label>Group Name</label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Add Contacts</label>
                <div className="contacts-selection">
                  {contacts.map(contact => (
                    <div key={contact._id} className="contact-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedContacts.includes(contact._id)}
                        onChange={() => toggleContactSelection(contact._id)}
                      />
                      <span>{contact.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary">
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Members Modal */}
      {showAddMembersModal && selectedGroup && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Add Members to {selectedGroup.name}</h3>
              <button
                className="close-btn"
                onClick={() => setShowAddMembersModal(false)}
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleAddMembersSubmit}>
              <div className="form-group">
                <label>Select Contacts to Add</label>
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Search contacts..."
                    value={contactSearchTerm}
                    onChange={(e) => setContactSearchTerm(e.target.value)}
                  />
                </div>

                <div className="contacts-selection">
                  {contacts
                    .filter(contact => !selectedGroup.members.some(m => m._id === contact._id))
                    .filter(contact => contact.name.toLowerCase().includes(contactSearchTerm.toLowerCase()))
                    .map(contact => (
                      <div key={contact._id} className="contact-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedContacts.includes(contact._id)}
                          onChange={() => toggleContactSelection(contact._id)}
                        />
                        <span>{contact.name}</span>
                      </div>
                    ))
                  }
                </div>

              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddMembersModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary"><i className="fa-solid fa-user-plus"></i> Add Members
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Group Details Modal */}
      {showGroupDetailsModal && selectedGroup && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{selectedGroup.name}</h3>
              <button
                className="close-btn"
                onClick={() => setShowGroupDetailsModal(false)}
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            <div className="group-details-content">
              {selectedGroup.description && (
                <p className="group-description">{selectedGroup.description}</p>
              )}

              <div className="group-members-section">
                <h4>Group Members ({selectedGroup.members.length})</h4>
                <div className="group-members-list">
                  {selectedGroup.members.length > 0 ? (
                    selectedGroup.members.map(member => (
                      <div key={member._id} className="group-member-item">
                        <div className="member-info">
                          <div className="member-avatar">
                            {member.avatar ? (
                              <img src={member.avatar} alt={member.name} />
                            ) : (
                              <span className="member-initial">
                                {member.initial || member.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="member-details">
                            <h5>{member.name}</h5>
                            <p>{member.phone}</p>
                            {member.email && <p className="member-email">{member.email}</p>}
                          </div>
                        </div>
                        <button
                          className="remove-member-btn"
                          onClick={() => handleRemoveContact(member._id)}
                          title="Remove from group"
                        >
                          <i className="fa-solid fa-times"></i>
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="empty-members">
                      <p>No members in this group yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setShowGroupDetailsModal(false)}
                className="primary"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowGroupDetailsModal(false);
                  handleAddMembers(selectedGroup);
                }}
              >
                Add More Members
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;