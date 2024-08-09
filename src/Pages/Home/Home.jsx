// src/pages/Home/Home.jsx
import React, { useState } from 'react';
import ImageGenerator from '../../components/ImageGenerator/ImageGenerator';
import LoraFetcher from '../../components/ImageGenerator/CivitaiModels/LoraFetcher';
// import Sidebar from '../../components/ImageGenerator/SideBar/SideBar';

const Home = () => {
    const [selectedLoras, setSelectedLoras] = useState([]);

    const handleLorasUpdate = (loras) => {
        setSelectedLoras(loras);
    };

    return (
        <div className='home-container'>
            <ImageGenerator loras={selectedLoras} />
            <LoraFetcher onLorasUpdate={handleLorasUpdate} />
            {/* <Sidebar /> */}
        </div>
    );
};

export default Home;
