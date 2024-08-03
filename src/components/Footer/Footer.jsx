import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-links">
        <a href="/">Generate Images</a>
          <a href="/about-us">About Us</a>
          <a href="/contact-us">Contact Us</a>
          <a href="/terms-and-conditions">Terms and Conditions</a>
          <a href="/privacy-policy">Privacy Policy</a>
          <a href="/disclaimer">Disclaimer</a>
        </div>
        <div className="footer-copy">
          &copy; {new Date().getFullYear()} Chibigen. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
