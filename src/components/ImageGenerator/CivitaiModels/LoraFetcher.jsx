import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useDebounce } from 'use-debounce';
import './styles.css';

const MODELS_API_URL = 'https://civitai.com/api/v1/models';
const MODEL_VERSIONS_API_URL = 'https://civitai.com/api/v1/model-versions/';

const LoraFetcher = ({ onLorasUpdate }) => {
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [query, setQuery] = useState('');
    const [loadingMore, setLoadingMore] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [nextCursor, setNextCursor] = useState(null);
    const [includeNSFW, setIncludeNSFW] = useState(false);
    const [selectedTag, setSelectedTag] = useState('character');
    const [loraCount, setLoraCount] = useState(0);
    const [debouncedQuery] = useDebounce(query, 300);
    const [selectedModels, setSelectedModels] = useState({});
    const [modelParameters, setModelParameters] = useState({});
    const [versionNames, setVersionNames] = useState({});
    const [trainedWords, setTrainedWords] = useState({});

    // Debounce slider changes
    const [debouncedModelParameters] = useDebounce(modelParameters, 500);

    useEffect(() => {
        if (isVisible) {
            fetchModels();
        }
    }, [page, debouncedQuery, includeNSFW, selectedTag, isVisible]);

    useEffect(() => {
        getSelectedLoras().then(selectedLoras => onLorasUpdate(selectedLoras));
    }, [selectedModels, debouncedModelParameters]);

    useEffect(() => {
        // Fetch version names for selected models
        const fetchVersionNames = async () => {
            const names = {};
            await Promise.all(
                Object.values(selectedModels).map(async (versionId) => {
                    if (!names[versionId]) {
                        const name = await getVersionName(versionId);
                        names[versionId] = name;
                    }
                })
            );
            setVersionNames(names);
        };
        fetchVersionNames();
    }, [selectedModels]);

    useEffect(() => {
        // Fetch trained words for selected models
        const fetchTrainedWords = async () => {
            const words = {};
            await Promise.all(
                Object.entries(selectedModels).map(async ([modelId, versionId]) => {
                    if (!words[versionId]) {
                        const versionDetails = await fetchVersionDetails(versionId);
                        words[versionId] = versionDetails?.trainedWords || [];
                    }
                })
            );
            setTrainedWords(words);
        };
        fetchTrainedWords();
    }, [selectedModels]);

    const fetchModels = async () => {
        setLoading(page === 1 && !loadingMore);
        setLoadingSearch(page === 1 && !loadingMore);
        setLoadingMore(page > 1);

        let fetchedModels = [];
        let cursor = nextCursor;
        const fetchedModelIds = new Set(models.map(model => model.id));

        try {
            while (fetchedModels.length < 10) {
                const response = await axios.get(MODELS_API_URL, {
                    params: {
                        page,
                        query: debouncedQuery,
                        tag: selectedTag,
                        nsfw: includeNSFW,
                        limit: 50,
                        cursor,
                    },
                });

                if (response.data?.items) {
                    const filteredModels = response.data.items
                        .filter(item => item.modelVersions.some(version => version.baseModel === 'Pony'))
                        .filter(item => !fetchedModelIds.has(item.id));

                    fetchedModels = [...fetchedModels, ...filteredModels];

                    if (fetchedModels.length >= 10 || !response.data.metadata?.nextCursor) {
                        break;
                    }

                    cursor = response.data.metadata?.nextCursor || null;
                } else {
                    setError('No models found or invalid response.');
                    break;
                }
            }

            if (fetchedModels.length > 0) {
                const pageModels = fetchedModels.slice(0, 10);
                setModels(prevModels => (page === 1 ? pageModels : [...prevModels, ...pageModels]));
                setNextCursor(cursor);
            } else {
                return null;
            }
        } catch (err) {
            setError(`Error fetching models: ${err.message}`);
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setLoadingSearch(false);
        }
    };

    const handleSearch = (e) => {
        setQuery(e.target.value);
        setModels([]);
        setPage(1);
        setNextCursor(null);
        setLoadingSearch(true);
    };

    const loadMore = () => {
        if (!nextCursor || loadingMore) return;
        setPage(prevPage => prevPage + 1);
    };

    const toggleVisibility = () => {
        if (!isVisible) {
            setPage(1);
            setQuery('');
            setModels([]);
            setNextCursor(null);
            setLoadingSearch(true);
        }
        setIsVisible(prev => !prev);
    };

    const handleNSFWToggle = () => {
        setIncludeNSFW(prev => !prev);
        setModels([]);
        setPage(1);
        setNextCursor(null);
        setLoadingSearch(true);
    };

    const handleTagChange = (tag) => {
        setSelectedTag(tag);
        setModels([]);
        setPage(1);
        setNextCursor(null);
        setLoadingSearch(true);
    };

    const getDefaultVersion = (versions) => {
        return versions.find(version => version.baseModel === 'Pony') || versions[0];
    };

    const getImageUrl = (model) => {
        for (const version of model.modelVersions) {
            const image = version.images.find(img => img.type === 'image' && img.url);
            if (image) return image.url;
        }
        return null;
    };

    const fetchVersionDetails = async (modelId) => {
        try {
            const response = await axios.get(`${MODEL_VERSIONS_API_URL}${modelId}`);
            return response.data;
        } catch (error) {
            return null;
        }
    };

    const handleVersionSelect = async (modelId, versionId) => {
        setSelectedModels(prevModels => {
            const newModels = { ...prevModels };
            let updatedCount = loraCount;

            if (newModels[modelId] === versionId) {
                delete newModels[modelId];
                updatedCount = updatedCount - 1;
                setModelParameters(prevParams => {
                    const newParams = { ...prevParams };
                    delete newParams[modelId];
                    return newParams;
                });
            } else {
                if (Object.keys(newModels).length >= 5 && !newModels[modelId]) {
                    alert('You can only select up to 5 LoRAs.');
                    return prevModels;
                }
                newModels[modelId] = versionId;
                if (!prevModels[modelId]) {
                    updatedCount = updatedCount + 1;
                }
                setModelParameters(prevParams => ({
                    ...prevParams,
                    [modelId]: 1
                }));
            }

            // Fetch trained words when model is selected
            if (!selectedModels[modelId] && versionId) {
                fetchVersionDetails(versionId).then(details => {
                    setTrainedWords(prevWords => ({
                        ...prevWords,
                        [versionId]: details?.trainedWords || []
                    }));
                });
            }

            setLoraCount(updatedCount);
            return newModels;
        });
    };

    const handleDeselectModel = (modelId) => {
        setSelectedModels(prevModels => {
            const newModels = { ...prevModels };
            if (newModels[modelId]) {
                delete newModels[modelId];
                setLoraCount(count => count - 1);
                setModelParameters(prevParams => {
                    const newParams = { ...prevParams };
                    delete newParams[modelId];
                    return newParams;
                });
            }
            return newModels;
        });
    };

    const debouncedHandleSliderChange = useCallback((modelId, value) => {
        setModelParameters(prevParams => ({
            ...prevParams,
            [modelId]: value
        }));
    }, []);

    useEffect(() => {
        getSelectedLoras().then(selectedLoras => onLorasUpdate(selectedLoras));
    }, [debouncedModelParameters]);

    const handleSliderChange = (modelId, value) => {
        debouncedHandleSliderChange(modelId, value);
    };

    const getSelectedLoras = async () => {
        const loras = await Promise.all(
            Object.entries(selectedModels).map(async ([modelId, versionId]) => {
                // Fetch version details
                const versionDetails = await fetchVersionDetails(modelId, versionId);

                if (versionDetails) {
                    // If fetching version details is successful
                    return {
                        name: String(modelId), // Ensure versionId is a string
                        model: 1,
                        clip: 1,
                        is_version: false
                    };
                } else {
                    // If fetching version details fails
                    return {
                        name: String(versionId), // Ensure modelId is a string
                        model: 1,
                        clip: 1,
                        is_version: true
                    };
                }
            })
        );

        return loras;
    };

    const getVersionName = async (versionId) => {
        try {
            const response = await axios.get(`${MODEL_VERSIONS_API_URL}${versionId}`);
            return response.data?.name || 'Unknown Version';
        } catch (error) {
            return 'Unknown Version';
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            // Create notification element
            const tooltip = document.createElement('div');
            tooltip.textContent = 'Copied to clipboard!';
            tooltip.className = 'copy-tooltip-notification';
            document.body.appendChild(tooltip);

            // Remove notification after 2 seconds
            setTimeout(() => {
                tooltip.classList.add('fade-out');
                tooltip.addEventListener('animationend', () => {
                    document.body.removeChild(tooltip);
                });
            }, 1500);
        }, (err) => {
            console.error('Failed to copy: ', err);
        });
    };


    const formatTrainedWords = (words) => {
        return words.map(word => word.split(',').map(part => part.trim()));
    };


    return (
        <div className="models-container">
            <div className="header">
                <div className="lora-info">
                    <div className="lora-count-container">
                        <span className="lora-count">
                            {loraCount}/5 LoRAs
                            <button onClick={toggleVisibility} className="add-lora-button">
                                <span className="material-icons">add</span>
                            </button>

                        </span>
                    </div>
                </div>
                <div className="selected-models-container">
                    {Object.entries(selectedModels).length > 0 ? (
                        Object.entries(selectedModels).map(([modelId, versionId]) => (
                            <div key={modelId} className="selected-model-item">
                                <span className='selected-model-title'>
                                    {models.find(model => String(model.id) === String(modelId))?.name + " " || 'Unknown Model'}
                                    -
                                    {` ${versionNames[versionId] || 'Unknown Version'}`}
                                </span>

                                {modelParameters[modelId] !== undefined && (
                                    <div className="slider-container">
                                        <label className='slider-label'>
                                            Model Strength:
                                            <input
                                                type="range"
                                                min="-2"
                                                max="2"
                                                step="0.1"
                                                value={modelParameters[modelId]}
                                                onChange={(e) => handleSliderChange(modelId, parseFloat(e.target.value))}
                                                className="slider"
                                            />
                                            <input
                                                type="number"
                                                min="-2"
                                                max="2"
                                                step="0.1"
                                                value={modelParameters[modelId]}
                                                onChange={(e) => handleSliderChange(modelId, parseFloat(e.target.value))}
                                                className="slider-value-input"
                                            />
                                        </label>
                                    </div>
                                )}

                                {trainedWords[versionId] && trainedWords[versionId].length > 0 && (
                                    <div className="trained-words-container">
                                        <strong>Trigger Words:</strong>
                                        <div className="trained-words-list">
                                            {formatTrainedWords(trainedWords[versionId]).map((block, blockIdx) => (
                                                <div key={blockIdx} className="trained-words-block" onClick={() => copyToClipboard(block.join(', '))}>
                                                    <span className="trained-words-text">
                                                        {block.join(', ')}
                                                        <div className="copy-tooltip">Copy to clipboard</div>
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}



                                <button
                                    onClick={() => handleDeselectModel(modelId)}
                                    className="remove-button"
                                >
                                    Remove
                                </button>
                            </div>
                        ))
                    ) : (
                        <div className="no-selection">
                            No models selected
                        </div>
                    )}
                </div>

            </div>
            {isVisible && (
                <div className="modal-overlay" onClick={toggleVisibility}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="close-button" onClick={toggleVisibility}>&times;</button>
                        <input
                            type="text"
                            value={query}
                            onChange={handleSearch}
                            placeholder="Search models..."
                            className="search-input"
                        />
                        <label className="nsfw-switch">
                            <input
                                type="checkbox"
                                checked={includeNSFW}
                                onChange={handleNSFWToggle}
                            />
                            <span>Include NSFW Models</span>
                        </label>
                        <div className="tabs">
                            {['character', 'style', 'concept', 'clothing', 'poses', 'background'].map(tag => (
                                <button
                                    key={tag}
                                    className={`tab ${selectedTag === tag ? 'active' : ''}`}
                                    onClick={() => handleTagChange(tag)}
                                >
                                    {tag.charAt(0).toUpperCase() + tag.slice(1)}
                                </button>
                            ))}
                        </div>
                        <div className="model-list">
                            {(loading || loadingSearch) && !loadingMore && <div className="loader" />}
                            {error && <div className="error">Error: {error}</div>}
                            {models.length === 0 && !loading && !loadingSearch && <div className="no-results">No models available</div>}
                            {models.map((model) => {
                                const defaultVersion = getDefaultVersion(model.modelVersions);
                                const imageUrl = getImageUrl(model);
                                const selectedVersionId = selectedModels[model.id] || defaultVersion.id;

                                return (
                                    <div className="model-item" key={model.id}>
                                        <div className="model-image">
                                            {imageUrl ? (
                                                <img
                                                    src={imageUrl}
                                                    alt={model.name}
                                                    className="model-image-img"
                                                />
                                            ) : (
                                                <div className="no-image">No image available</div>
                                            )}
                                        </div>
                                        <div className="model-title">
                                            <h2>{model.name}</h2>
                                        </div>
                                        {model.modelVersions.length > 1 && (
                                            <div className="model-versions">
                                                <strong>Versions:</strong>
                                                <select
                                                    value={selectedVersionId}
                                                    onChange={(e) => handleVersionSelect(model.id, e.target.value)}
                                                    className="version-select"
                                                >
                                                    {model.modelVersions.map((version) => (
                                                        <option key={version.id} value={version.id}>
                                                            {version.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => handleVersionSelect(model.id, defaultVersion.id)}
                                            className="select-button"
                                        >
                                            {selectedModels[model.id] ? 'Deselect' : 'Select'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="load-more-container">
                            <button onClick={loadMore} className="load-more-button" disabled={loadingMore}>
                                {loadingMore ? <div className="loader-small"></div> : 'Load More'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoraFetcher;
