import React, { useState, useEffect } from 'react';
import emailjs from 'emailjs-com';
import './SuggestionBox.css';

const SUGGESTION_COOLDOWN = 500 * 1000; // 500 seconds in milliseconds

const SuggestionBox = () => {
    const [suggestion, setSuggestion] = useState('');
    const [status, setStatus] = useState('');
    const [isOpen, setIsOpen] = useState(false); // State for managing visibility
    const [isSending, setIsSending] = useState(false); // Track sending status
    const [cooldownTime, setCooldownTime] = useState(0); // Remaining cooldown time

    // Effect to check the cooldown on component mount
    useEffect(() => {
        const lastSuggestionTime = localStorage.getItem('lastSuggestionTime');
        if (lastSuggestionTime) {
            const elapsed = Date.now() - lastSuggestionTime;
            if (elapsed < SUGGESTION_COOLDOWN) {
                setIsSending(true);
                const remainingCooldown = SUGGESTION_COOLDOWN - elapsed;
                setCooldownTime(remainingCooldown);
                
                const cooldownInterval = setInterval(() => {
                    setCooldownTime((prev) => {
                        if (prev <= 1000) {
                            clearInterval(cooldownInterval);
                            setIsSending(false); // Reset sending state
                            return 0; // Reset cooldown time
                        }
                        return prev - 1000; // Decrease the cooldown time by 1 second
                    });
                }, 1000); // Update every second

                // Cleanup interval on unmount
                return () => clearInterval(cooldownInterval);
            }
        }
    }, []);

    const sendEmail = (e) => {
        e.preventDefault();

        if (isSending) {
            const remainingSeconds = Math.ceil(cooldownTime / 1000);
            console.log(`Cooldown active. Remaining seconds: ${remainingSeconds}`); // Add this line
            setStatus(`Please wait ${remainingSeconds} seconds before sending another suggestion.`);
            return; // Early return if in cooldown
        }
        

        // Check if suggestion is empty
        if (!suggestion.trim()) {
            setStatus('Please enter a suggestion.');
            return;
        }

        // EmailJS service
        emailjs.send(
            'service_iv44gyg', // Replace with your service ID
            'template_goiv20q', // Replace with your template ID
            { message: suggestion }, // This will replace the variables in your email template
            'hCFRUZ7VPdRvnceh2' // Replace with your user ID
        )
        .then((result) => {
            console.log(result.text);
            setSuggestion(''); // Clear the textarea
            setStatus('Suggestion sent successfully!');

            // Record the time of the suggestion
            const currentTime = Date.now();
            localStorage.setItem('lastSuggestionTime', currentTime);
            setIsSending(true);
            setCooldownTime(SUGGESTION_COOLDOWN); // Set cooldown time

            const cooldownInterval = setInterval(() => {
                setCooldownTime((prev) => {
                    if (prev <= 1000) {
                        clearInterval(cooldownInterval); // Clear the interval when time is up
                        setIsSending(false); // Reset sending state
                        return 0; // Reset cooldown time
                    }
                    return prev - 1000; // Decrease the cooldown time by 1 second
                });
            }, 1000); // Update every second

            // Cleanup interval on unmount
            return () => clearInterval(cooldownInterval);
        })
        .catch((error) => {
            console.error(error);
            setStatus('Failed to send suggestion. Please try again.'); // Notify user of failure
        });
    };

    return (
        <div className="suggestion-container">
            <button className="toggle-button" onClick={() => setIsOpen(prev => !prev)}>
                {isOpen ? 'Hide Suggestions' : 'Add Suggestions'}
            </button>
            {isOpen && (
                <div className="suggestion-box">
                    <h3>Have a suggestion? Let us know!</h3>
                    <form onSubmit={sendEmail}>
                        <textarea
                            value={suggestion}
                            onChange={(e) => setSuggestion(e.target.value)}
                            placeholder="Type your suggestion here..."
                            rows="4"
                            required
                        />
                        <button type="submit" disabled={isSending}>Send Suggestion</button>
                    </form>
                    {status && <p className="status-message">{status}</p>} {/* Display status message */}
                </div>
            )}
        </div>
    );
};

export default SuggestionBox;
