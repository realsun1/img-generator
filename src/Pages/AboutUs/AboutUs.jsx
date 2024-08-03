// src/pages/AboutUs/AboutUs.jsx
import React from 'react';
import './AboutUs.css'; // Include any additional styling here

const AboutUs = () => {
  return (
    <div className="about-us-container">
      <h1>About Chibigen.com</h1>
      <p>Welcome to <strong>Chibigen.com</strong>, your ultimate destination for generating stunning anime-inspired images. Our platform leverages advanced AI technology to create vibrant and detailed anime artwork, tailored to your preferences.</p>
      
      <h2>Our Mission</h2>
      <p>At Chibigen, our mission is to empower artists, fans, and creators by providing a seamless tool for generating unique anime visuals. Whether you’re looking for creative inspiration or just want to explore the world of anime art, we’re here to make that experience as engaging and enjoyable as possible.</p>
      
      <h2>What We Offer</h2>
      <ul>
        <li><strong>AI-Powered Image Generation:</strong> Our state-of-the-art AI models generate high-quality anime images based on your input.</li>
        <li><strong>Customizable Options:</strong> Tailor your images with a variety of styles, themes, and elements to match your vision.</li>
        <li><strong>NSFW Content:</strong> We offer the capability to generate NSFW anime content in a safe and controlled manner, ensuring compliance with community guidelines.</li>
      </ul>

      <h2>Our Commitment</h2>
      <p>We are committed to providing a safe and respectful environment for all users. Our AI models are designed to adhere to ethical guidelines and ensure that all generated content respects community standards and legal requirements.</p>
      
      <h2>Get in Touch</h2>
      <p>Have questions or feedback? Feel free to <a href="/contact-us">contact us</a>. We value your input and are here to help you with any inquiries you might have.</p>

    </div>
  );
};

export default AboutUs;
