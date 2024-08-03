// src/pages/ContactUs/ContactUs.jsx
import React from 'react';
import './ContactUs.css'; // Ensure this file contains your styles

const ContactUs = () => {
  return (
    <div className="contact-us-container">
      <h1>Contact Us</h1>
      <p>If you have any questions, feedback, or inquiries, feel free to reach out to us directly at:</p>
      
      <div className="contact-info">
        <p>Email: <a href="mailto:animechibigen@gmail.com">animechibigen@gmail.com</a></p>
      </div>
    </div>
  );
};

export default ContactUs;
