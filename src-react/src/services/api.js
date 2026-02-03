const API_BASE_URL = 'http://localhost:8000';

export const api = {
    async login(email, password) {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Login failed');
        }
        return response.json();
    },

    async register(email, password) {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Registration failed');
        }
        return response.json();
    },

    async getMe(token) {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch user');
        return response.json();
    },

    async getTexts(token) {
        const response = await fetch(`${API_BASE_URL}/texts`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch texts');
        return response.json();
    },

    async createText(token, data) {
        const response = await fetch(`${API_BASE_URL}/texts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create text');
        return response.json();
    },

    async deleteText(token, textId) {
        const response = await fetch(`${API_BASE_URL}/texts/${textId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to delete text');
        return true;
    },

    async getTextById(token, textId) {
        const response = await fetch(`${API_BASE_URL}/texts/${textId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch text');
        return response.json();
    },

    async updateText(token, textId, data) {
        const response = await fetch(`${API_BASE_URL}/texts/${textId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update text');
        return response.json();
    },

    async getSentences(token, textId) {
        const response = await fetch(`${API_BASE_URL}/texts/${textId}/sentences`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch sentences');
        return response.json();
    },

    /* Split functionality removed in favor of Spacy backend import
    async splitParagraph(token, paraId, sentences) { ... } 
    */

    async updateSentence(token, sentId, data) {
        const response = await fetch(`${API_BASE_URL}/sentences/${sentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update sentence');
        return response.json();
    },

    async updateProgress(token, textId, data) {
        const response = await fetch(`${API_BASE_URL}/texts/${textId}/progress`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update progress');
        return response.json();
    }
};
