/**
 * Auth Service - 用户认证服务
 * 处理登录、注册、Token 管理
 */

const API_BASE = 'http://localhost:8000';
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export const authService = {
    /**
     * 用户注册
     */
    async register(email, password) {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Registration failed');
        }

        const data = await response.json();
        this.saveAuth(data.access_token, data.user);
        return data.user;
    },

    /**
     * 用户登录
     */
    async login(email, password) {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Login failed');
        }

        const data = await response.json();
        this.saveAuth(data.access_token, data.user);
        return data.user;
    },

    /**
     * 登出
     */
    logout() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    },

    /**
     * 保存认证信息
     */
    saveAuth(token, user) {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    },

    /**
     * 获取 Token
     */
    getToken() {
        return localStorage.getItem(TOKEN_KEY);
    },

    /**
     * 获取当前用户
     */
    getCurrentUser() {
        const userJson = localStorage.getItem(USER_KEY);
        return userJson ? JSON.parse(userJson) : null;
    },

    /**
     * 检查是否已登录
     */
    isLoggedIn() {
        return !!this.getToken();
    },

    /**
     * 获取带认证的 headers
     */
    getAuthHeaders() {
        const token = this.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }
};

/**
 * Text Service - 文本管理服务
 */
export const textService = {
    /**
     * 获取用户的文本列表
     */
    async getTexts() {
        const response = await fetch(`${API_BASE}/texts`, {
            headers: {
                ...authService.getAuthHeaders(),
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                authService.logout();
                window.location.href = '/login.html';
                return [];
            }
            throw new Error('Failed to fetch texts');
        }

        return response.json();
    },

    /**
     * 创建新文本
     */
    async createText(title, content, scaffoldingData = null) {
        const response = await fetch(`${API_BASE}/texts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authService.getAuthHeaders(),
            },
            body: JSON.stringify({ title, content, scaffolding_data: scaffoldingData }),
        });

        if (!response.ok) {
            throw new Error('Failed to create text');
        }

        return response.json();
    },

    /**
     * 获取单个文本
     */
    async getText(id) {
        const response = await fetch(`${API_BASE}/texts/${id}`, {
            headers: authService.getAuthHeaders(),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch text');
        }

        return response.json();
    },

    /**
     * 获取文本段落
     */
    async getParagraphs(textId) {
        const response = await fetch(`${API_BASE}/texts/${textId}/paragraphs`, {
            headers: authService.getAuthHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch paragraphs');
        return response.json();
    },

    /**
     * 更新段落分析
     */
    async updateParagraph(paraId, analysis, translation) {
        const response = await fetch(`${API_BASE}/paragraphs/${paraId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...authService.getAuthHeaders(),
            },
            body: JSON.stringify({ analysis, translation }),
        });
        if (!response.ok) throw new Error('Failed to update paragraph');
        return response.json();
    },

    /**
     * 更新文本
     */
    async updateText(id, data) {
        const response = await fetch(`${API_BASE}/texts/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...authService.getAuthHeaders(),
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error('Failed to update text');
        }

        return response.json();
    },

    /**
     * 删除文本
     */
    async deleteText(id) {
        const response = await fetch(`${API_BASE}/texts/${id}`, {
            method: 'DELETE',
            headers: authService.getAuthHeaders(),
        });

        if (!response.ok) {
            throw new Error('Failed to delete text');
        }
    },

    /**
     * 更新阅读进度
     */
    async updateProgress(id, progressData) {
        // progressData: { reading_mode, scaffold_level, vocab_level, current_paragraph_id }
        const response = await fetch(`${API_BASE}/texts/${id}/progress`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...authService.getAuthHeaders(),
            },
            body: JSON.stringify(progressData),
        });

        if (!response.ok) {
            console.error('Failed to sync progress');
        }
        return response.json();
    }
};
