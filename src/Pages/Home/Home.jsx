// src/pages/Home/Home.jsx
import React, { useState } from 'react';
import ImageGenerator from '../../components/ImageGenerator/ImageGenerator';
import LoraFetcher from '../../components/ImageGenerator/CivitaiModels/LoraFetcher';

const Home = () => {
    const [selectedLoras, setSelectedLoras] = useState([]);

    const handleLorasUpdate = (loras) => {
        setSelectedLoras(loras);
    };

    return (
        <div className='home-container'>
            <ImageGenerator loras={selectedLoras} />
            <LoraFetcher onLorasUpdate={handleLorasUpdate} />
        </div>
    );
};

export default Home;
