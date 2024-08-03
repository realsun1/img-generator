// src/Routes.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import App from './App';
import Home from './Pages/Home/Home';
import AboutUs from './Pages/AboutUs/AboutUs';
import ContactUs from './Pages/ContactUs/ContactUs';
import TermsAndConditions from './Pages/TermsAndConditions/TermsAndConditions'
import PrivacyPolicy from './Pages/PrivacyPolicy/PrivacyPolicy'
import Disclaimer from './Pages/Disclaimer/Disclaimer'
// Import other pages as needed

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Home />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/contact-us" element={<ContactUs />} />
          <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/disclaimer" element={<Disclaimer />} />
          {/* Add other routes here */}
        </Route>
      </Routes>
    </Router>
  );
};

export default AppRoutes;
