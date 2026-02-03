import React, { useState } from 'react';
import './Settings.css';

const Settings = ({ currentUser}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        username: currentUser.username,
        email: currentUser.email,
        password: '',
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const [, setCurrentUserData] = useState(currentUser);

    const handleSave = async () => {
        setLoading(true);
        try {
            const payload = { ...formData };
            if (!payload.password) delete payload.password;

            const res = await fetch(`http://localhost:5000/api/users/${currentUser.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'user-id': currentUser.id
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to update profile');

            alert('Profile updated successfully!');
            setIsEditing(false);
            setCurrentUserData(data.user); // update local state
            setFormData(prev => ({ ...prev, password: '' })); // clear password
        } catch (err) {
            console.error(err);
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="settings">
            <div className="settings-section">
                <h2>Profile</h2>

                <div className="setting-item">
                    <div className="setting-info">
                        <h3>Username : </h3>
                        <h4>{isEditing ? (
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                            />
                        ) : (
                            <p>{currentUser.username}</p>
                        )}</h4>
                    </div>
                </div>

                <div className="setting-item">
                    <div className="setting-info">
                        <h3>Email</h3>
                        {isEditing ? (
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        ) : (
                            <p>{currentUser.email}</p>
                        )}
                    </div>
                </div>

                {isEditing && (
                    <div className="setting-item">
                        <div className="setting-info">
                            <h3>New Password</h3>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Leave blank to keep current password"
                            />
                        </div>
                    </div>
                )}

                {isEditing && (
                    <div className="modal-actions">
                        <button className="primary" onClick={handleSave} disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                )}
                <button className="edit-btn" onClick={() => setIsEditing(!isEditing)}>
                    {isEditing ? 'Cancel' : 'Edit'}
                </button>
                <h3>*Change in profile will be appear after re-login*</h3>
            </div>
        </div>
    );
};

export default Settings;
