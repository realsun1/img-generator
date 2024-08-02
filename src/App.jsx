import React, { useState } from 'react';
import ImageGenerator from './components/ImageGenerator/ImageGenerator';
import LoraFetcher from './components/ImageGenerator/CivitaiModels/LoraFetcher';


const App = () => {
    const [selectedLoras, setSelectedLoras] = useState([]);

    // Callback to update selected LoRAs from LoraFetcher
    const handleLorasUpdate = (loras) => {
        setSelectedLoras(loras);
    };

    return (
      <>
      <ImageGenerator loras={selectedLoras} />
      <LoraFetcher onLorasUpdate={handleLorasUpdate} />
      </>
            

    );
};

export default App;
