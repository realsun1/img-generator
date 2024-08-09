import React, { useState } from 'react';
import { FaHome, FaImage, FaCogs, FaUser, FaSignOutAlt, FaQuestionCircle, FaSearch } from 'react-icons/fa';
import './Sidebar.css'; // Import the CSS for styling

const Sidebar = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    return (
        <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            <button className="collapse-btn" onClick={toggleCollapse}>
                {isCollapsed ? '☰' : '×'}
            </button>
            <div className="menu">
                <a href="#home" className="menu-item">
                    <FaHome className="icon" />
                    {!isCollapsed && <span className="text">Home</span>}
                </a>
                <a href="#gallery" className="menu-item">
                    <FaImage className="icon" />
                    {!isCollapsed && <span className="text">Gallery</span>}
                </a>
                <a href="#generate" className="menu-item">
                    <FaImage className="icon" />
                    {!isCollapsed && <span className="text">Generate</span>}
                </a>
                <a href="#models" className="menu-item">
                    <FaCogs className="icon" />
                    {!isCollapsed && <span className="text">Models</span>}
                </a>
                <a href="#profile" className="menu-item">
                    <FaUser className="icon" />
                    {!isCollapsed && <span className="text">Profile</span>}
                </a>
                <a href="#logout" className="menu-item">
                    <FaSignOutAlt className="icon" />
                    {!isCollapsed && <span className="text">Logout</span>}
                </a>
                <a href="#help" className="menu-item">
                    <FaQuestionCircle className="icon" />
                    {!isCollapsed && <span className="text">Help</span>}
                </a>
                <div className="search-bar">
                    <input type="text" placeholder="Search..." />
                    <FaSearch className="search-icon" />
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
