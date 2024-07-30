import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './styles.css';

const CORS_PROXY = 'https://long-sun-739d.spikenooob.workers.dev/';
const INITIATE_URL = `${CORS_PROXY}api/v2/generate/async`;
const CHECK_STATUS_URL = `${CORS_PROXY}api/v2/generate/check`;
const RETRIEVE_STATUS_URL = `${CORS_PROXY}api/v2/generate/status`;

const ImageGenerator = () => {
    const [prompt, setPrompt] = useState('');
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(false);

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

    const initiateImageGeneration = async () => {
        setLoading(true);
        const hiddenPrompt = 'score_9, score_8_up, score_7_up, anime style, anime, ';
        const negativePrompt = 'score_6, score_5, score_4, simple background, 3d, realistic, watermark';
        const combinedPrompt = `${hiddenPrompt} ${prompt || 'a cute catgirl'} ### ${negativePrompt}`;

        try {
            const response = await axios.post(
                INITIATE_URL,
                {
                    prompt: combinedPrompt,
                    params: {
                        sampler_name: 'k_euler_a',
                        cfg_scale: 5,
                        seed: "",
                        height: 1024,
                        width: 1024,
                        steps: 25,
                        n: 1,
                        hires_fix: true,
                        clip_skip: 2
                    },
                    nsfw: true,
                    trusted_workers: false,
                    slow_workers: true,
                    censor_nsfw: false,
                    models: ['Pony Diffusion XL'],
                    karras: true,
                    allow_downgrade: true,
                    loras: [
                        {
                            name: '298005',
                            model: 0.4,
                            clip: 1,
                            is_version: true,
                        },
                        {
                            name: '330475',
                            model: 0.4,
                            clip: 1,
                            isV_version: true,
                        }
                    ],
                    tis: [
                        {

                        }
                    ],
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
        } catch (error) {
            console.error('Error initiating generation:', error.response ? error.response.data : error.message);
            setLoading(false);
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
                    <button onClick={initiateImageGeneration} className="generate-button" disabled={loading}>
                        {loading ? <div className="loader" /> : 'Generate Image'}
                    </button>
                </div>
            </div>
            <div className="queue">
                <h2>Queue</h2>
                {queue.length === 0 ? (
                    <div className="placeholder">No images in queue.</div>
                ) : (
                    queue.map((item) => (
                        <div className="queue-item" key={item.id}>
                            <p><strong>Prompt:</strong> {item.prompt}</p>
                            <p><strong>Status:</strong> {item.status}</p>
                            {item.eta && <p><strong>ETA:</strong> {item.eta}</p>}
                            {item.imageUrl && <img src={item.imageUrl} alt={`Generated result for ${item.prompt}`} />}
                            {!item.done && !item.cancelled && (
                                <button onClick={() => cancelGeneration(item.id)} className="cancel-button">X</button>
                            )}
                        </div>
                    ))
                )}
                <div className="clear-button-container">
                    <button onClick={clearCancelledAndFinishedRequests} className="clear-button">
                        Clear
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImageGenerator;
