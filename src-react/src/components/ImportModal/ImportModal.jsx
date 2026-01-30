import { useState } from 'react';
import { aiService } from '../../services/aiService';

export default function ImportModal({ isOpen, onClose, onImport }) {
    const [activeTab, setActiveTab] = useState('text');
    const [textValue, setTextValue] = useState('');
    const [urlValue, setUrlValue] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleProcess = async () => {
        if (activeTab === 'text') {
            if (!textValue.trim()) return;

            setLoading(true);
            try {
                const data = await aiService.analyzeText(textValue);
                if (data && data.paragraphs) {
                    onImport(data.paragraphs);
                    onClose();
                } else {
                    alert("AI Analysis failed to return valid structure.");
                }
            } catch (err) {
                console.error(err);
                if (err.message.includes("Key is missing")) {
                    const key = prompt("⚠️ API Key Missing. Enter your Google Gemini API Key:");
                    if (key?.trim()) {
                        localStorage.setItem('GOOGLE_API_KEY', key.trim());
                        alert("Key saved! Reloading...");
                        window.location.reload();
                    }
                } else {
                    alert("Error: " + err.message);
                }
            } finally {
                setLoading(false);
            }
        } else {
            // URL mode - mock for now
            setLoading(true);
            setTimeout(() => {
                setLoading(false);
                onClose();
                // Could implement URL fetching here
                alert("URL import coming soon!");
            }, 600);
        }
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className={`modal-overlay ${isOpen ? 'show' : ''}`}
            style={{ display: 'flex' }}
            onClick={handleOverlayClick}
        >
            <div className="modal-content">
                <h2>✨ Smart Import</h2>

                <div className="import-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'text' ? 'active' : ''}`}
                        onClick={() => setActiveTab('text')}
                    >
                        Text Paste
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'url' ? 'active' : ''}`}
                        onClick={() => setActiveTab('url')}
                    >
                        URL Fetch
                    </button>
                </div>

                <div className={`tab-pane ${activeTab === 'text' ? 'active' : ''}`}>
                    <textarea
                        placeholder="Paste your article here..."
                        value={textValue}
                        onChange={(e) => setTextValue(e.target.value)}
                        style={{ width: '100%', minHeight: '200px', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                    />
                </div>

                <div className={`tab-pane ${activeTab === 'url' ? 'active' : ''}`} style={{ display: activeTab === 'url' ? 'block' : 'none' }}>
                    <input
                        type="text"
                        placeholder="https://example.com/article"
                        value={urlValue}
                        onChange={(e) => setUrlValue(e.target.value)}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}
                    />
                    <p className="hint-text">Paste a URL to automatically extract and scaffold content.</p>
                </div>

                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn-primary" onClick={handleProcess} disabled={loading}>
                        {loading ? 'Processing...' : 'Magic Enhance 🪄'}
                    </button>
                </div>

                {loading && (
                    <div className="loading-overlay">
                        <div className="spinner"></div>
                        <p>AI is digesting content...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
