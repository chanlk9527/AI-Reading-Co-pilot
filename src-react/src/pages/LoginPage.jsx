import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isRegister, setIsRegister] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isRegister) {
                await api.register(email, password);
                await login(email, password);
            } else {
                await login(email, password);
            }
            navigate('/library');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <style>{`
                .login-page {
                    min-height: 100vh;
                    width: 100vw;
                    display: flex;
                    background: #f8fafc;
                    position: fixed;
                    top: 0;
                    left: 0;
                    z-index: 100;
                }
                
                /* Left Panel - Branding */
                .login-branding {
                    flex: 1;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    padding: 60px;
                    position: relative;
                    overflow: hidden;
                }
                .login-branding::before {
                    content: '';
                    position: absolute;
                    top: -50%;
                    left: -50%;
                    width: 200%;
                    height: 200%;
                    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%);
                    animation: rotate 30s linear infinite;
                }
                @keyframes rotate {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .branding-content {
                    position: relative;
                    z-index: 1;
                    text-align: center;
                    color: white;
                    max-width: 480px;
                }
                .branding-icon {
                    font-size: 5rem;
                    margin-bottom: 32px;
                    display: block;
                }
                .branding-title {
                    font-size: 2.5rem;
                    font-weight: 800;
                    margin: 0 0 16px 0;
                    letter-spacing: -0.5px;
                }
                .branding-desc {
                    font-size: 1.15rem;
                    opacity: 0.9;
                    line-height: 1.7;
                    margin: 0 0 40px 0;
                }
                .branding-features {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    text-align: left;
                }
                .feature-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    background: rgba(255,255,255,0.1);
                    padding: 16px 20px;
                    border-radius: 12px;
                    backdrop-filter: blur(10px);
                }
                .feature-icon {
                    font-size: 1.5rem;
                }
                .feature-text {
                    font-size: 0.95rem;
                    font-weight: 500;
                }
                
                /* Right Panel - Form */
                .login-form-panel {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    padding: 60px;
                    background: white;
                }
                .form-container {
                    width: 100%;
                    max-width: 440px;
                }
                .form-header {
                    margin-bottom: 40px;
                }
                .form-title {
                    font-size: 2rem;
                    font-weight: 700;
                    color: #1e293b;
                    margin: 0 0 8px 0;
                }
                .form-subtitle {
                    color: #64748b;
                    font-size: 1rem;
                    margin: 0;
                }
                .login-error {
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    color: #dc2626;
                    padding: 14px 18px;
                    border-radius: 12px;
                    margin-bottom: 24px;
                    font-size: 0.9rem;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .login-form {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }
                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .form-label {
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: #374151;
                }
                .form-input {
                    width: 100%;
                    padding: 16px 18px;
                    border: 2px solid #e5e7eb;
                    border-radius: 12px;
                    font-size: 1rem;
                    transition: all 0.2s;
                    outline: none;
                    box-sizing: border-box;
                    background: #f9fafb;
                }
                .form-input:focus {
                    border-color: #667eea;
                    background: white;
                    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
                }
                .form-input::placeholder {
                    color: #9ca3af;
                }
                .login-btn {
                    width: 100%;
                    padding: 18px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-size: 1.05rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                    margin-top: 8px;
                }
                .login-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 12px 24px rgba(102, 126, 234, 0.35);
                }
                .login-btn:active:not(:disabled) {
                    transform: translateY(0);
                }
                .login-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }
                .toggle-section {
                    text-align: center;
                    margin-top: 32px;
                    padding-top: 32px;
                    border-top: 1px solid #e5e7eb;
                }
                .toggle-text {
                    color: #64748b;
                    font-size: 0.95rem;
                }
                .toggle-btn {
                    background: none;
                    border: none;
                    color: #667eea;
                    font-size: 0.95rem;
                    cursor: pointer;
                    font-weight: 600;
                    transition: color 0.2s;
                    margin-left: 4px;
                }
                .toggle-btn:hover {
                    color: #764ba2;
                    text-decoration: underline;
                }
                
                /* Responsive: Stack on smaller screens */
                @media (max-width: 1024px) {
                    .login-page {
                        flex-direction: column;
                    }
                    .login-branding {
                        padding: 40px 24px;
                        min-height: auto;
                    }
                    .branding-icon {
                        font-size: 3rem;
                        margin-bottom: 16px;
                    }
                    .branding-title {
                        font-size: 1.75rem;
                    }
                    .branding-desc {
                        font-size: 1rem;
                        margin-bottom: 24px;
                    }
                    .branding-features {
                        display: none;
                    }
                    .login-form-panel {
                        padding: 40px 24px;
                    }
                }
            `}</style>

            {/* Left: Branding Panel */}
            <div className="login-branding">
                <div className="branding-content">
                    <span className="branding-icon">📚</span>
                    <h1 className="branding-title">AI Reading Co-pilot</h1>
                    <p className="branding-desc">
                        智能英语阅读助手，通过 AI 辅助让您的阅读体验更高效、更深入
                    </p>
                    <div className="branding-features">
                        <div className="feature-item">
                            <span className="feature-icon">🎯</span>
                            <span className="feature-text">沉浸式阅读 - Flow Mode 让您专注文本</span>
                        </div>
                        <div className="feature-item">
                            <span className="feature-icon">📖</span>
                            <span className="feature-text">智能学习 - AI 实时解析词汇与语境</span>
                        </div>
                        <div className="feature-item">
                            <span className="feature-icon">🔊</span>
                            <span className="feature-text">语音朗读 - 高品质 TTS 辅助听力训练</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right: Form Panel */}
            <div className="login-form-panel">
                <div className="form-container">
                    <div className="form-header">
                        <h2 className="form-title">
                            {isRegister ? '创建新账户' : '欢迎回来'}
                        </h2>
                        <p className="form-subtitle">
                            {isRegister ? '注册后即可开始您的阅读之旅' : '请登录以继续使用'}
                        </p>
                    </div>

                    {error && (
                        <div className="login-error">
                            <span>⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    <form className="login-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">邮箱地址</label>
                            <input
                                type="email"
                                className="form-input"
                                placeholder="your@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">密码</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="至少 6 位字符"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>

                        <button
                            type="submit"
                            className="login-btn"
                            disabled={loading}
                        >
                            {loading ? '处理中...' : (isRegister ? '立即注册' : '登录')}
                        </button>
                    </form>

                    <div className="toggle-section">
                        <span className="toggle-text">
                            {isRegister ? '已有账户？' : '还没有账户？'}
                        </span>
                        <button
                            type="button"
                            className="toggle-btn"
                            onClick={() => setIsRegister(!isRegister)}
                        >
                            {isRegister ? '点击登录' : '立即注册'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
