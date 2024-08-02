import React, { useState, useEffect } from 'react';
import axios from 'axios';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import './styles.css';

const DOWNLOAD_PROXY = 'https://downloader.spikenooob.workers.dev/?url=';
const CORS_PROXY = 'https://long-sun-739d.spikenooob.workers.dev/';
const INITIATE_URL = `${CORS_PROXY}api/v2/generate/async`;
const CHECK_STATUS_URL = `${CORS_PROXY}api/v2/generate/check`;
const RETRIEVE_STATUS_URL = `${CORS_PROXY}api/v2/generate/status`;

const MAX_QUEUE_SIZE = 5; // Maximum number of images in the queue

const ImageGenerator = ({ loras }) => {
    const [prompt, setPrompt] = useState(localStorage.getItem('prompt') || '');
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState('');
    const [canDownloadAll, setCanDownloadAll] = useState(false); // Track if download all button should be enabled
    const [images, setImages] = useState([]); // Array of image URLs

    const [characters, setCharacters] = useState([]);
    const [tags, setTags] = useState([]);

useEffect(() => {
    const fetchFiles = async () => {
        try {
            const characterResponse = await fetch('/src/components/data/anime_characters.txt');
            const characterText = await characterResponse.text();
            // Use the whole line for characters
            setCharacters(characterText.split('\n').filter(line => line.trim() !== ''));

            const tagResponse = await fetch('/src/components/data/tags.txt');
            const tagText = await tagResponse.text();
            // Extract the first word from each line for tags
            setTags(tagText.split('\n').map(line => line.split(/\s+/)[0]).filter(word => word));
        } catch (error) {
            console.error('Error loading files:', error);
        }
    };

    fetchFiles();
}, []);



    let presetLoras = [
        {
            "name": "298005",
            "model": 1,
            "clip": 1,
            "is_version": true
        }
    ];

    let combinedLoras = [...loras, ...presetLoras];

    useEffect(() => {
        const interval = setInterval(() => {
            setQueue(prevQueue =>
                prevQueue.map(item => {
                    if (!item.done && !item.cancelled && !item.isCheckingStatus) {
                        const shouldCheckStatus = !item.eta || item.eta <= 60 || (Date.now() - item.lastChecked >= item.checkInterval);
                        if (shouldCheckStatus) {
                            checkGenerationStatus(item.id);
                        }
                    }
                    return item;
                })
            );
        }, 10000); // Check every 10 seconds
        return () => clearInterval(interval);
    }, [queue]);

    useEffect(() => {
        localStorage.setItem('prompt', prompt);
    }, [prompt]);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification('');
            }, 3000); // 3 seconds

            return () => clearTimeout(timer);
        }
    }, [notification]);

    useEffect(() => {
        // Update the state to enable/disable download all button
        const hasFinishedImages = queue.some(item => item.done && item.imageUrl);
        setCanDownloadAll(hasFinishedImages);
    }, [queue]);

    const initiateImageGeneration = async () => {
        // Count only processing items
        const processingCount = queue.filter(item => !item.done && !item.cancelled).length;

        if (processingCount >= MAX_QUEUE_SIZE) {
            setNotification('Queue is full. Please wait until some images are processed before adding more.');
            return;
        }

        setLoading(true);
        const hiddenPrompt = 'score_9, score_8_up, score_7_up, anime style, anime,';
        const negativePrompt = 'score_6, score_5, score_4, simple background, 3d, realistic, watermark';
        const combinedPrompt = `${hiddenPrompt} ${prompt || 'a cute catgirl'} ### ${negativePrompt}`;

        try {
            const response = await axios.post(
                INITIATE_URL,
                {
                    "prompt": combinedPrompt,
                    "params": {
                        "cfg_scale": 5,
                        "seed": "",
                        "sampler_name": "k_dpmpp_sde",
                        "height": 1024,
                        "width": 1024,
                        "post_processing": ["RealESRGAN_x4plus_anime_6B"],
                        "steps": 25,
                        "tiling": false,
                        "karras": true,
                        "hires_fix": true,
                        "clip_skip": 2,
                        "n": 1,
                        "loras": combinedLoras,
                    },
                    "nsfw": true,
                    "censor_nsfw": false,
                    "trusted_workers": true,
                    "models": [
                        "Pony Diffusion XL"
                    ],
                    "replacement_filter": false,
                },
                {
                    headers: {
                        'Client-Agent': 'unknown:0:unknown',
                        'apikey': import.meta.env.VITE_API_KEY,
                        'Content-Type': 'application/json',
                    }
                }
            );

            const newItem = {
                id: response.data.id,
                prompt: prompt || 'a cute catgirl',
                status: 'Generation started. Checking status...',
                eta: response.data.wait_time || 'Calculating..',
                imageUrl: '',
                done: false,
                cancelled: false,
                isCheckingStatus: false,
                lastChecked: Date.now(),
                checkInterval: 10000 // Initial check interval 10 seconds
            };

            setQueue(prevQueue => [...prevQueue, newItem]);
            setLoading(false);
            setNotification('Image generation initiated.');
        } catch (error) {
            console.error('Error initiating generation:', error.response ? error.response.data : error.message);
            setLoading(false);
            setNotification('Error initiating generation.');
        }
    };

    const checkGenerationStatus = async (requestId) => {
        try {
            setQueue(prevQueue =>
                prevQueue.map(item =>
                    item.id === requestId ? { ...item, isCheckingStatus: true } : item
                )
            );

            const response = await axios.get(
                `${CHECK_STATUS_URL}/${requestId}`,
                {
                    headers: {
                        'Client-Agent': 'unknown:0:unknown',
                        'apikey': import.meta.env.VITE_API_KEY
                    }
                }
            );

            setQueue(prevQueue =>
                prevQueue.map(item =>
                    item.id === requestId
                        ? {
                            ...item,
                            status: response.data.done ? 'Generation complete. Retrieving results...' : 'Image is still being processed.',
                            eta: response.data.done ? '' : `${Math.max(0, response.data.wait_time)} seconds`,
                            done: response.data.done,
                            isCheckingStatus: false,
                            lastChecked: Date.now(),
                            checkInterval: response.data.done ? item.checkInterval : Math.min(item.checkInterval * 2, 60000) // Exponential backoff up to 60 seconds
                        }
                        : item
                )
            );

            if (response.data.done) {
                retrieveGenerationResults(requestId);
            }
        } catch (error) {
            console.error('Error checking status:', error.response ? error.response.data : error.message);
            setQueue(prevQueue =>
                prevQueue.map(item =>
                    item.id === requestId ? { ...item, isCheckingStatus: false } : item
                )
            );
        }
    };

    const retrieveGenerationResults = async (requestId) => {
        try {
            const response = await axios.get(
                `${RETRIEVE_STATUS_URL}/${requestId}`,
                {
                    headers: {
                        'Client-Agent': 'unknown:0:unknown',
                        'apikey': import.meta.env.VITE_API_KEY
                    }
                }
            );

            if (response.data && response.data.generations && response.data.generations.length > 0) {
                const imageUrl = response.data.generations[0].img;
                setQueue(prevQueue =>
                    prevQueue.map(item =>
                        item.id === requestId ? { ...item, imageUrl, status: 'Generation complete.', done: true } : item
                    )
                );
                setImages(prevImages => [...prevImages, imageUrl]); // Add finished image to the list
            } else {
                setQueue(prevQueue =>
                    prevQueue.map(item =>
                        item.id === requestId ? { ...item, status: 'Error retrieving results.', done: true } : item
                    )
                );
            }
        } catch (error) {
            console.error('Error retrieving results:', error.response ? error.response.data : error.message);
        }
    };

    const cancelGeneration = async (requestId) => {
        try {
            const response = await axios.delete(
                `${RETRIEVE_STATUS_URL}/${requestId}`,
                {
                    headers: {
                        'Client-Agent': 'unknown:0:unknown',
                        'apikey': import.meta.env.VITE_API_KEY
                    }
                }
            );

            if (response.status === 200) {
                setQueue(prevQueue =>
                    prevQueue.map(item =>
                        item.id === requestId ? { ...item, status: 'Request cancelled.', done: true, cancelled: true } : item
                    )
                );
            } else {
                console.error('Failed to cancel request. Status code:', response.status);
            }
        } catch (error) {
            console.error('Error cancelling request:', error.response ? error.response.data : error.message);
        }
    };

    const clearCancelledAndFinishedRequests = () => {
        setQueue(prevQueue => prevQueue.filter(item => !item.cancelled && !item.done));
    };

    const [error, setError] = useState(null);

    const downloadImage = async (imageUrl) => {
        try {
            const response = await axios.get(DOWNLOAD_PROXY + encodeURIComponent(imageUrl), {
                responseType: 'blob'
            });

            const contentType = response.headers['content-type'];
            let fileExtension = 'png'; // Default extension
            let imageBlob = response.data;

            if (contentType.includes('webp')) {
                // Convert WebP to PNG
                const blob = new Blob([response.data], { type: contentType });
                const img = new Image();
                img.src = URL.createObjectURL(blob);

                await new Promise((resolve) => {
                    img.onload = resolve;
                });

                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                imageBlob = await new Promise((resolve) => {
                    canvas.toBlob(resolve, 'image/png');
                });
                fileExtension = 'png';
            }

            const url = window.URL.createObjectURL(imageBlob);
            const link = document.createElement('a');
            link.href = url;
            const fileName = imageUrl.split('/').pop().split('?')[0] + `.${fileExtension}`
            link.setAttribute('download', `${fileName}`); // Set the filename with the correct extension
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading image:', error.message);
            setError(error.message);
        }
    };


    const downloadAllImages = async () => {
        const zip = new JSZip();

        for (const imageUrl of images) {
            try {
                const response = await axios.get(DOWNLOAD_PROXY + encodeURIComponent(imageUrl), {
                    responseType: 'blob'
                });

                // Get the content type and derive the file extension
                const contentType = response.headers['content-type'];
                let fileExtension = 'png'; // Default extension
                if (contentType.includes('webp')) {
                    fileExtension = 'png';
                }
                const fileName = imageUrl.split('/').pop().split('?')[0] + `.${fileExtension}`;
                zip.file(fileName, response.data);
            } catch (error) {
                console.error('Error fetching image', imageUrl, error);
                setError(`Error fetching image ${imageUrl}: ${error.message}`);
            }
        }

        zip.generateAsync({ type: 'blob' }).then((content) => {
            saveAs(content, 'images.zip');
        }).catch(error => {
            console.error('Error generating zip:', error.message);
            setError(`Error generating zip: ${error.message}`);
        });
    };

    const injectRandomCharacter = () => {
        if (characters.length === 0) return;
    
        const randomCharacter = characters[Math.floor(Math.random() * characters.length)];
        setPrompt(prevPrompt => `${prevPrompt} ${randomCharacter}`);
    };
    
    const injectRandomTag = () => {
        if (tags.length === 0) return;
    
        const randomTag = tags[Math.floor(Math.random() * tags.length)];
        setPrompt(prevPrompt => `${prevPrompt} ${randomTag},`);
    };
    

    return (
        <div className="container">
            <div className="content">
            <div className="generator">
    <h1>Anime Image Generator</h1>
    <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter your prompt here..."
        rows="4"
        cols="50"
    />
    <div className="button-container">
        <button onClick={initiateImageGeneration} className="generate-button" disabled={loading}>
            {loading ? <div className="loader" /> : 'Generate Image'}
        </button>
        <button onClick={injectRandomCharacter} className="inject-button">Add Random Character</button>
        <button onClick={injectRandomTag} className="inject-button">Add Random Tag</button>
    </div>
</div>

            </div>
            <div className="queue">
                <h2>Queue</h2>
                {queue.length === 0 ? (
                    <div className="placeholder">No images in queue.</div>
                ) : (
                    queue.map((item, index) => (
                        <div className="queue-item" key={item.id}>
                            <p><strong>Prompt:</strong> {item.prompt}</p>
                            <p><strong>Status:</strong> {item.status}</p>
                            {item.eta && <p><strong>ETA:</strong> {item.eta}</p>}
                            {item.imageUrl && (
                                <div className="image-container">
                                    <img src={item.imageUrl} alt="Generated" className="result-image" />
                                    <div className="download-overlay">
                                        <button onClick={() => downloadImage(item.imageUrl)} className="download-button">
                                            <i className="fa fa-download"></i>
                                        </button>
                                    </div>
                                </div>

                            )}
                            {!item.done && !item.cancelled && (
                                <button onClick={() => cancelGeneration(item.id)} className="cancel-button">X</button>
                            )}
                        </div>
                    ))
                )}
                <div className="button-container">
                    <button onClick={clearCancelledAndFinishedRequests} className="clear-button">Clear</button>
                    <button
                        onClick={downloadAllImages}
                        className="download-all-button"
                        disabled={!canDownloadAll} // Disable button if no finished images
                    >
                        Download All
                    </button>
                </div>
            </div>
            {notification && (
                <div className="notification">
                    {notification}
                </div>
            )}
        </div>
    );
};

export default ImageGenerator;
