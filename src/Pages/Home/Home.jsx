// src/pages/Home/Home.jsx
import React, { useState } from 'react';
import ImageGenerator from '../../components/ImageGenerator/ImageGenerator';
import LoraFetcher from '../../components/ImageGenerator/CivitaiModels/LoraFetcher';
// import Sidebar from '../../components/ImageGenerator/SideBar/SideBar';
import SuggestionBox from '../../components/ImageGenerator/SuggestionBox/SuggestionBox';

const Home = () => {
    const [selectedLoras, setSelectedLoras] = useState([]);

    const handleLorasUpdate = (loras) => {
        setSelectedLoras(loras);
    };

    return (
        <div className='home-container'>
            <ImageGenerator loras={selectedLoras} />
            <LoraFetcher onLorasUpdate={handleLorasUpdate} />
            <SuggestionBox />
            {/* <Sidebar /> */}
        </div>
    );
};

export default Home;
