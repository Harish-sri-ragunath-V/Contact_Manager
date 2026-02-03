import React, { useState, useEffect } from 'react';
import '../ContactsApp.css';
import MapView from './MapView';

const Dashboard = ({ currentUser }) => {
    const [todos, setTodos] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [emergencyContacts, setEmergencyContacts] = useState([]);
    const [showTodoModal, setShowTodoModal] = useState(false);
    const [showEmergencyModal, setShowEmergencyModal] = useState(false);
    const [selectedEmergencyContacts, setSelectedEmergencyContacts] = useState([]);
    const [showMapModal, setShowMapModal] = useState(false);
    const [todoDescription, setTodoDescription] = useState('');
    const [todoDueDate, setTodoDueDate] = useState('');
    const [filter, setFilter] = useState('upcoming');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const userId = currentUser.id;

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
    useEffect(() => {
        fetchTodos();
        fetchContacts();
        const savedEmergency = localStorage.getItem(`emergencyContacts_${userId}`);
        if (savedEmergency) {
            setEmergencyContacts(JSON.parse(savedEmergency));
        }
    }, [filter, userId]);

    const fetchTodos = async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/todos`, {
                headers: { 'user-id': userId }
            });
            const data = await response.json();
            setTodos(data);
        } catch (error) {
            console.error('Error fetching todos:', error);
        }
    };

    // Map locations - handle MongoDB GeoJSON format [lng, lat]
    const locations = contacts
        .filter(c => c.location && c.location.coordinates)
        .map(c => ({
            lat: c.location.coordinates[1], // latitude
            lng: c.location.coordinates[0], // longitude
            name: c.name
        }));

    const contactStats = [
        { name: 'Total Contacts', value: contacts.length, icon: 'fa-users', color: '#3b82f6' },
        { name: 'Todos', value: todos.length, icon: 'fa-tasks', color: '#8b5cf6' },
        { name: 'Emergency Contacts', value: emergencyContacts.length, icon: 'fa-exclamation-triangle', color: '#ef4444' }
    ];

    const handleViewMap = () => {
        if (locations.length === 0) {
            alert('No contacts with location available');
            return;
        }
        setShowMapModal(true);
    };

    const handleAddTodo = async (e) => {
        e.preventDefault();
        setError('');
        if (!todoDescription) {
            setError('Please enter a description');
            return;
        }
        setIsSubmitting(true);
        try {
            const response = await fetch('http://localhost:5000/api/todos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'user-id': userId
                },
                body: JSON.stringify({
                    description: todoDescription,
                    dueDate: todoDueDate || null
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create todo');
            }

            const newTodo = await response.json();
            setTodos(prev => [...prev, newTodo]);
            setShowTodoModal(false);
            resetTodoForm();
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to add todo');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetTodoForm = () => {
        setTodoDescription('');
        setTodoDueDate('');
        setError('');
    };

    const handleRemoveTodo = async (todoId) => {
        try {
            const response = await fetch(`http://localhost:5000/api/todos/${todoId}`, {
                method: 'DELETE',
                headers: { 'user-id': userId }
            });

            if (response.ok) {
                setTodos(prev => prev.filter(todo => todo._id !== todoId));
            }
        } catch (error) {
            console.error('Error deleting todo:', error);
        }
    };

    const handleCompleteTodo = async (todoId) => {
        try {
            const response = await fetch(`http://localhost:5000/api/todos/${todoId}/complete`, {
                method: 'PATCH',
                headers: { 'user-id': userId }
            });

            if (response.ok) {
                const updatedTodo = await response.json();
                setTodos(prev =>
                    prev.map(todo => (todo._id === todoId ? updatedTodo : todo))
                );
            }
        } catch (error) {
            console.error('Error completing todo:', error);
        }
    };

    const handleAddEmergencyContacts = (e) => {
        e.preventDefault();
        const selectedContacts = contacts.filter(contact =>
            selectedEmergencyContacts.includes(contact._id)
        );
        setEmergencyContacts(selectedContacts);
        localStorage.setItem(`emergencyContacts_${userId}`, JSON.stringify(selectedContacts));
        setSelectedEmergencyContacts([]);
        setShowEmergencyModal(false);
    };

    const handleRemoveEmergencyContact = (contactId) => {
        const newEmergencyContacts = emergencyContacts.filter(contact => contact._id !== contactId);
        setEmergencyContacts(newEmergencyContacts);
        localStorage.setItem(`emergencyContacts_${userId}`, JSON.stringify(newEmergencyContacts));
    };

    const toggleEmergencyContactSelection = (contactId) => {
        setSelectedEmergencyContacts(prev =>
            prev.includes(contactId)
                ? prev.filter(id => id !== contactId)
                : [...prev, contactId]
        );
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'No due date';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className="dashboard">
            <div className="stats-overview">
                {contactStats.map((stat, index) => (
                    <div key={index} className="stat-card">
                        <div className="stat-icon" style={{ backgroundColor: `${stat.color}20` }}>
                            <i className={`fas ${stat.icon}`} style={{ color: stat.color }}></i>
                        </div>
                        <div className="stat-info">
                            <h3>{stat.value}</h3>
                            <p>{stat.name}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="dashboard-section">
                <h3>Location-aware Contacts</h3>
                <div className="section-content">
                    <div className="action-item" onClick={handleViewMap}>
                        <i className="fas fa-map"></i>
                        <span>View map</span>
                    </div>
                </div>
            </div>

            {/* Todos Section */}
            <div className="dashboard-lower">
                <div className="dashboard-section-insights-section">
                    <div className="section-header"><h3>Todo List</h3></div>
                    <div className="section-content">
                        <div className="insight-header">
                            <i className="fas fa-tasks"></i>
                            <span>Todos</span>
                            <div className="filter-actions">
                                <select value={filter} onChange={e => setFilter(e.target.value)}>
                                    <option value="upcoming">Upcoming</option>
                                    <option value="today">Today</option>
                                    <option value="past">Past</option>
                                </select>
                            </div>
                        </div>
                        <div className="reminders-grid-container">
                            <div className="reminders-grid">
                                {todos.length > 0 ? (
                                    todos.map(todo => (
                                        <div key={todo._id} className={`reminder-card ${todo.isCompleted ? 'completed' : ''}`}>
                                            <div className="reminder-content">
                                                <p className="reminder-description">{todo.description}</p>
                                                <div className="reminder-meta">
                                                    <div className="reminder-date">
                                                        <i className="fa-solid fa-calendar"></i> {formatDate(todo.dueDate)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="reminder-actions">
                                                {!todo.isCompleted && <button className="complete-btn" onClick={() => handleCompleteTodo(todo._id)}><i className="fa-solid fa-check"></i></button>}
                                                <button className="remove-btn" onClick={() => handleRemoveTodo(todo._id)}><i className="fa-solid fa-times"></i></button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="empty-section">
                                        <div className="empty-icon"><i className="fa-solid fa-tasks"></i></div>
                                        <p>No {filter} todos</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="add-todo-button">
                            <button className="add-small-btn" onClick={() => setShowTodoModal(true)}><i className="fa-solid fa-plus"></i> Add Todo</button>
                        </div>
                    </div>
                </div>

                <div className="dashboard-section emergency-section">
                    <div className="section-header">
                        <h3>Emergency Mode</h3>
                    </div>

                    <div className="section-content">
                        {/* Always show Set button */}
                        <div style={{ marginBottom: '10px' }}>
                            <button
                                className="add-small-btn"
                                onClick={() => setShowEmergencyModal(true)}
                            >
                                <i className="fa-solid fa-plus"></i> Set emergency contacts
                            </button>
                        </div>

                        {/* Emergency contacts list */}
                        {emergencyContacts.length > 0 ? (
                            emergencyContacts.map(contact => (
                                <div key={contact._id} className="emergency-contact">
                                    <div className="emergency-contact-info">
                                        <span className="emergency-name">{contact.name}</span>
                                    </div>
                                    <div className="emergency-actions">
                                        <button
                                            className="notify-btn"
                                            onClick={() => alert(`Emergency notification would be sent to ${contact.name}`)}
                                        >
                                            Notify
                                        </button>
                                        <button
                                            className="remove-btn"
                                            onClick={() => handleRemoveEmergencyContact(contact._id)}
                                        >
                                            <i className="fa-solid fa-times"></i>
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="empty-section">
                                <div className="empty-icon"><i className="fa-solid fa-users-slash"></i></div>
                                <p>No emergency contacts set</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Modals */}
            {showTodoModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Add New Todo</h3>
                            <button className="close-btn" onClick={() => { setShowTodoModal(false); resetTodoForm(); }}><i className="fa-solid fa-times"></i></button>
                        </div>
                        <form onSubmit={handleAddTodo}>
                            <div className="form-group">
                                <label>Description *</label>
                                <textarea value={todoDescription} onChange={e => setTodoDescription(e.target.value)} rows="4" required placeholder="Enter your todo" />
                            </div>
                            <div className="form-group">
                                <label>Due Date (Optional)</label>
                                <input type="date" value={todoDueDate} onChange={e => setTodoDueDate(e.target.value)} />
                            </div>
                            {error && <p className="error">{error}</p>}
                            <div className="modal-actions">
                                <button type="button" onClick={() => { setShowTodoModal(false); resetTodoForm(); }}>Cancel</button>
                                <button type="submit" className="primary" disabled={isSubmitting}>{isSubmitting ? 'Adding...' : 'Add Todo'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showEmergencyModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Emergency Contacts</h3>
                            <button className="close-btn" onClick={() => setShowEmergencyModal(false)}><i className="fa-solid fa-times"></i></button>
                        </div>
                        <form onSubmit={handleAddEmergencyContacts}>
                            <div className="form-group">
                                <label>Select Emergency Contacts</label>
                                <div className="contacts-selection emergency-selection">
                                    {contacts.map(contact => (
                                        <div key={contact._id} className="contact-checkbox">
                                            <input type="checkbox" checked={selectedEmergencyContacts.includes(contact._id)} onChange={() => toggleEmergencyContactSelection(contact._id)} />
                                            <div className="contact-checkbox-info">
                                                <span className="contact-name">{contact.name}</span>
                                                <span className="contact-phone">{contact.phone}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="modal-info">
                                <i className="fa-solid fa-info-circle"></i>
                                <span>Selected contacts will be notified in emergency situations</span>
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowEmergencyModal(false)}>Cancel</button>
                                <button type="submit" className="primary">Save Emergency Contacts</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Map Modal */}
            {showMapModal && (
                <div className="modal-overlay">
                    <div className="modal-large-map-modal">
                        <div className="modal-header">
                            <h3>Contacts Map</h3>
                            <button className="close-btn" onClick={() => setShowMapModal(false)}>
                                <i className="fa-solid fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-content" style={{ height: '400px' }}>
                            <MapView locations={locations} />
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Dashboard;
