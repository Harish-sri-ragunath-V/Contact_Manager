import React from 'react';

function Nav({ activeSection, setActiveSection }) {
    return (
        <>
            <nav>
                <button
                    onClick={() => setActiveSection('dashboard')}
                    className={`nav-button ${activeSection === 'dashboard' ? 'active' : ''}`}
                >
                    <i className="fa-solid fa-house"></i> <span>Dashboard</span>
                </button>
                <button
                    onClick={() => setActiveSection('contacts')}
                    className={`nav-button ${activeSection === 'contacts' ? 'active' : ''}`}
                >
                    <i className="fa-solid fa-user"></i> <span>Contacts</span>
                </button>
                <button
                    onClick={() => setActiveSection('groups')}
                    className={`nav-button ${activeSection === 'groups' ? 'active' : ''}`}
                >
                    <i className="fa-solid fa-users"></i>
                    <span>Groups</span>
                </button>
                <button
                    onClick={() => setActiveSection('settings')}
                    className={`nav-button ${activeSection === 'settings' ? 'active' : ''}`}
                >
                    <i className="fa-solid fa-gear"></i><span>Profile</span>
                </button>
            </nav>
        </>
    )
}

export default Nav;