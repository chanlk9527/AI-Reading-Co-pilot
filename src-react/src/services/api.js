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

    async getSentences(token, textId, options = {}) {
        const {
            paragraphPage,
            paragraphPageSize,
            aroundSentenceId
        } = options;

        const params = new URLSearchParams();
        if (Number.isInteger(paragraphPage) && paragraphPage > 0) {
            params.set('paragraph_page', String(paragraphPage));
        }
        if (Number.isInteger(paragraphPageSize) && paragraphPageSize > 0) {
            params.set('paragraph_page_size', String(paragraphPageSize));
        }
        if (Number.isInteger(aroundSentenceId) && aroundSentenceId > 0) {
            params.set('around_sentence_id', String(aroundSentenceId));
        }

        const query = params.toString();
        const url = query
            ? `${API_BASE_URL}/texts/${textId}/sentences?${query}`
            : `${API_BASE_URL}/texts/${textId}/sentences`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch sentences');
        const items = await response.json();

        const pageHeader = response.headers.get('X-Paragraph-Page');
        const sizeHeader = response.headers.get('X-Paragraph-Page-Size');
        const totalHeader = response.headers.get('X-Paragraph-Total');
        const totalPagesHeader = response.headers.get('X-Paragraph-Total-Pages');

        const paging = {
            page: pageHeader ? parseInt(pageHeader, 10) : null,
            pageSize: sizeHeader ? parseInt(sizeHeader, 10) : null,
            totalParagraphs: totalHeader ? parseInt(totalHeader, 10) : null,
            totalPages: totalPagesHeader ? parseInt(totalPagesHeader, 10) : null
        };

        return { items, paging };
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
    },

    async getCredits(token) {
        const response = await fetch(`${API_BASE_URL}/ai/credits`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch credits');
        return response.json();
    },

    async recharge(token) {
        const response = await fetch(`${API_BASE_URL}/auth/recharge`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to recharge');
        return response.json();
    },

    async uploadPdf(token, file, options = {}) {
        const { startPage, endPage } = options;
        const formData = new FormData();
        formData.append('file', file);
        if (Number.isInteger(startPage) && startPage > 0) {
            formData.append('start_page', String(startPage));
        }
        if (Number.isInteger(endPage) && endPage > 0) {
            formData.append('end_page', String(endPage));
        }

        const response = await fetch(`${API_BASE_URL}/pdf/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (!response.ok) {
            let errorPayload = {};
            try {
                errorPayload = await response.json();
            } catch {
                errorPayload = {};
            }

            const detail = errorPayload?.detail;
            let message = 'PDF upload failed';
            if (typeof detail === 'string') {
                message = detail;
            } else if (detail && typeof detail === 'object') {
                message = detail.message || detail.code || message;
            }

            const err = new Error(message);
            if (detail && typeof detail === 'object') {
                err.detail = detail;
            }
            throw err;
        }
        return response.json();
    },

    async uploadEpub(token, file) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE_URL}/epub/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (!response.ok) {
            let errorPayload = {};
            try {
                errorPayload = await response.json();
            } catch {
                errorPayload = {};
            }

            const detail = errorPayload?.detail;
            let message = 'EPUB upload failed';
            if (typeof detail === 'string') {
                message = detail;
            } else if (detail && typeof detail === 'object') {
                message = detail.message || detail.code || message;
            }

            const err = new Error(message);
            if (detail && typeof detail === 'object') {
                err.detail = detail;
            }
            throw err;
        }
        return response.json();
    }
};
