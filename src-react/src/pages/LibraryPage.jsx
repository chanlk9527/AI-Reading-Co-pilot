import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function LibraryPage() {
    const { token, logout, user, recharge } = useAuth();
    const [texts, setTexts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importTitle, setImportTitle] = useState('');
    const [importContent, setImportContent] = useState('');
    const [importing, setImporting] = useState(false);
    const [recharging, setRecharging] = useState(false);
    const [importType, setImportType] = useState('text'); // 'text' or 'pdf'
    const [importFile, setImportFile] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const loadTexts = async () => {
            try {
                const data = await api.getTexts(token);
                setTexts(data);
            } catch (err) {
                console.error("Failed to load texts", err);
            } finally {
                setLoading(false);
            }
        };
        loadTexts();
    }, [token]);

    const handleImport = async () => {
        if (importType === 'text') {
            if (!importTitle.trim() || !importContent.trim()) {
                alert('请填写标题和内容');
                return;
            }
        } else if (importType === 'pdf') {
            if (!importFile) {
                alert('请选择 PDF 文件');
                return;
            }
        }

        setImporting(true);
        try {
            if (importType === 'pdf') {
                // Upload PDF first to get text
                const result = await api.uploadPdf(token, importFile);
                if (result.success) {
                    // Create text with extracted content
                    await api.createText(token, {
                        title: result.filename.replace('.pdf', ''),
                        content: result.text,
                        scaffolding_data: null
                    });
                }
            } else {
                // Text import
                await api.createText(token, {
                    title: importTitle.trim(),
                    content: importContent.trim(),
                    scaffolding_data: null
                });
            }

            const data = await api.getTexts(token);
            setTexts(data);
            setShowImportModal(false);
            setImportTitle('');
            setImportContent('');
            setImportFile(null);
            setImportType('text');
        } catch (e) {
            alert("导入失败: " + e.message);
        } finally {
            setImporting(false);
        }
    };

    const handleDelete = async (e, textId) => {
        e.stopPropagation();
        if (!confirm('确定要删除这篇文章吗？')) return;
        try {
            await api.deleteText(token, textId);
            setTexts(texts.filter(t => t.id !== textId));
        } catch (err) {
            alert("删除失败: " + err.message);
        }
    };

    return (
        <>
            <div className="library-page">
                <style>{`
                .library-page {
                    min-height: 100vh;
                    width: 100vw;
                    background: linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%);
                    padding: 0;
                    position: fixed;
                    top: 0;
                    left: 0;
                    overflow-y: auto;
                    z-index: 50;
                }
                .library-header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 24px 40px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
                }
                .library-brand {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: white;
                }
                .library-brand-icon {
                    font-size: 1.75rem;
                }
                .library-brand-text {
                    font-size: 1.25rem;
                    font-weight: 700;
                }
                .library-user {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }
                .library-user-email {
                    color: rgba(255,255,255,0.9);
                    font-size: 0.9rem;
                }
                .logout-btn {
                    background: rgba(255,255,255,0.15);
                    border: 1px solid rgba(255,255,255,0.3);
                    color: white;
                    padding: 8px 16px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 0.9rem;
                    transition: all 0.2s;
                }
                .logout-btn:hover {
                    background: rgba(255,255,255,0.25);
                }
                .credits-display {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(255,255,255,0.15);
                    padding: 8px 16px;
                    border-radius: 8px;
                    color: white;
                }
                .credits-icon {
                    font-size: 1rem;
                }
                .credits-value {
                    font-weight: 600;
                    font-size: 0.95rem;
                }
                .recharge-btn {
                    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                    border: none;
                    color: white;
                    padding: 6px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    font-weight: 600;
                    transition: all 0.2s;
                    margin-left: 8px;
                }
                .recharge-btn:hover:not(:disabled) {
                    transform: scale(1.05);
                    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
                }
                .recharge-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .library-content {
                    max-width: 1400px;
                    margin: 0 auto;
                    padding: 40px 60px 80px 60px;
                }
                .library-title-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 32px;
                    flex-wrap: wrap;
                    gap: 16px;
                }
                .library-title {
                    font-size: 2rem;
                    font-weight: 700;
                    color: #1e293b;
                    margin: 0;
                }
                .library-actions {
                    display: flex;
                    gap: 12px;
                }
                .action-btn {
                    padding: 12px 24px;
                    border-radius: 12px;
                    font-size: 0.95rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: none;
                }
                .action-btn.primary {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }
                .action-btn.primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
                }
                .action-btn.secondary {
                    background: white;
                    color: #475569;
                    border: 2px solid #e2e8f0;
                }
                .action-btn.secondary:hover {
                    border-color: #667eea;
                    color: #667eea;
                }
                
                /* Demo Card */
                .demo-card {
                    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                    border-radius: 16px;
                    padding: 24px;
                    margin-bottom: 32px;
                    border: 2px solid #f59e0b;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 16px;
                }
                .demo-card-info h3 {
                    margin: 0 0 8px 0;
                    color: #92400e;
                    font-size: 1.1rem;
                }
                .demo-card-info p {
                    margin: 0;
                    color: #a16207;
                    font-size: 0.9rem;
                }
                .demo-btn {
                    background: #f59e0b;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 10px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .demo-btn:hover {
                    background: #d97706;
                    transform: translateY(-2px);
                }
                
                .texts-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 24px;
                }
                .text-card {
                    background: white;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    cursor: pointer;
                    transition: all 0.3s;
                    border: 1px solid #e2e8f0;
                    position: relative;
                }
                .text-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.15);
                    border-color: #667eea;
                }
                .text-card-header {
                    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                    padding: 20px;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }
                .text-card-title {
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: #1e293b;
                    margin: 0 0 8px 0;
                    line-height: 1.4;
                    flex: 1;
                }
                .text-card-meta {
                    font-size: 0.8rem;
                    color: #94a3b8;
                }
                .text-card-body {
                    padding: 20px;
                }
                .text-card-preview {
                    font-size: 0.9rem;
                    color: #64748b;
                    line-height: 1.6;
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .delete-btn {
                    background: none;
                    border: none;
                    color: #94a3b8;
                    cursor: pointer;
                    padding: 4px 8px;
                    font-size: 1.1rem;
                    border-radius: 6px;
                    transition: all 0.2s;
                    flex-shrink: 0;
                }
                .delete-btn:hover {
                    background: #fee2e2;
                    color: #dc2626;
                }
                .empty-state {
                    text-align: center;
                    padding: 60px 20px;
                    background: white;
                    border-radius: 16px;
                    border: 2px dashed #e2e8f0;
                }
                .empty-icon {
                    font-size: 4rem;
                    margin-bottom: 16px;
                }
                .empty-title {
                    font-size: 1.25rem;
                    color: #475569;
                    margin: 0 0 8px 0;
                }
                .empty-desc {
                    color: #94a3b8;
                    margin: 0;
                }
                .loading-state {
                    text-align: center;
                    padding: 60px;
                    color: #64748b;
                }
                
                /* Import Modal */
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 20px;
                }
                .modal-content {
                    background: white;
                    border-radius: 16px;
                    width: 100%;
                    max-width: 600px;
                    max-height: 80vh;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    animation: modalIn 0.2s ease-out;
                }
                @keyframes modalIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .modal-header {
                    padding: 20px 24px;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .modal-header h2 {
                    margin: 0;
                    font-size: 1.25rem;
                    color: #1e293b;
                }
                .modal-close {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: #94a3b8;
                    padding: 4px;
                }
                .modal-close:hover {
                    color: #475569;
                }
                .modal-body {
                    padding: 24px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                .form-group label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 600;
                    color: #374151;
                }
                .form-group input,
                .form-group textarea {
                    width: 100%;
                    padding: 12px 16px;
                    border: 2px solid #e5e7eb;
                    border-radius: 10px;
                    font-size: 1rem;
                    transition: border-color 0.2s;
                    box-sizing: border-box;
                    font-family: inherit;
                }
                .form-group input:focus,
                .form-group textarea:focus {
                    outline: none;
                    border-color: #667eea;
                }
                .form-group textarea {
                    min-height: 200px;
                    resize: vertical;
                }
                .modal-footer {
                    padding: 16px 24px;
                    border-top: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                }
                .modal-btn {
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .modal-btn.cancel {
                    background: #f1f5f9;
                    border: none;
                    color: #64748b;
                }
                .modal-btn.cancel:hover {
                    background: #e2e8f0;
                }
                .modal-btn.submit {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border: none;
                    color: white;
                }
                .modal-btn.submit:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                }
                .modal-btn.submit:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                .import-tabs {
                    display: flex;
                    gap: 16px;
                    margin-bottom: 20px;
                    border-bottom: 1px solid #e2e8f0;
                    padding-bottom: 12px;
                }
                .import-tab {
                    padding: 8px 16px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    color: #64748b;
                    transition: all 0.2s;
                    background: none;
                    border: none;
                }
                .import-tab.active {
                    background: #eff6ff;
                    color: #667eea;
                }
                .import-tab:hover:not(.active) {
                    background: #f8fafc;
                }
                .file-upload-area {
                    border: 2px dashed #cbd5e1;
                    border-radius: 12px;
                    padding: 40px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    position: relative;
                }
                .file-upload-area:hover {
                    border-color: #667eea;
                    background: #f8fafc;
                }
                .file-input {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    opacity: 0;
                    cursor: pointer;
                }
            `}</style>

                <header className="library-header">
                    <div className="library-brand">
                        <span className="library-brand-icon">📚</span>
                        <span className="library-brand-text">AI Reading Co-pilot</span>
                    </div>
                    <div className="library-user">
                        <div className="credits-display">
                            <span className="credits-icon">💎</span>
                            <span className="credits-value">{user?.credits ?? 0} 积分</span>
                            <button
                                className="recharge-btn"
                                onClick={async () => {
                                    setRecharging(true);
                                    try {
                                        await recharge();
                                    } catch (err) {
                                        alert('充值失败: ' + err.message);
                                    } finally {
                                        setRecharging(false);
                                    }
                                }}
                                disabled={recharging}
                            >
                                {recharging ? '充值中...' : '+充值'}
                            </button>
                        </div>
                        <span className="library-user-email">{user?.email}</span>
                        <button className="logout-btn" onClick={logout}>退出登录</button>
                    </div>
                </header>

                <main className="library-content">
                    {/* Demo Card - Separate from user's library */}
                    <div className="demo-card">
                        <div className="demo-card-info">
                            <h3>🎯 体验演示文档</h3>
                            <p>使用内置的《傲慢与偏见》示例体验阅读助手功能</p>
                        </div>
                        <button className="demo-btn" onClick={() => navigate('/reader')}>
                            立即体验
                        </button>
                    </div>

                    <div className="library-title-row">
                        <h1 className="library-title">📖 我的书库</h1>
                        <div className="library-actions">
                            <button
                                className="action-btn primary"
                                onClick={() => {
                                    console.log('Import button clicked!');
                                    setShowImportModal(true);
                                }}
                                style={{ position: 'relative', zIndex: 100 }}
                            >
                                📥 导入文章
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="loading-state">
                            <p>正在加载...</p>
                        </div>
                    ) : texts.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">📭</div>
                            <h3 className="empty-title">书库空空如也</h3>
                            <p className="empty-desc">点击上方"导入文章"添加您的第一篇阅读文本</p>
                        </div>
                    ) : (
                        <div className="texts-grid">
                            {texts.map(text => (
                                <div
                                    key={text.id}
                                    className="text-card"
                                    onClick={() => navigate(`/reader/${text.id}`)}
                                >
                                    <div className="text-card-header">
                                        <div>
                                            <h3 className="text-card-title">{text.title}</h3>
                                            <div className="text-card-meta">
                                                更新于 {new Date(text.updated_at).toLocaleDateString('zh-CN')}
                                            </div>
                                        </div>
                                        <button
                                            className="delete-btn"
                                            onClick={(e) => handleDelete(e, text.id)}
                                            title="删除"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                    <div className="text-card-body">
                                        <p className="text-card-preview">{text.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>

            {/* Import Modal - outside the fixed library-page container */}
            {
                showImportModal && (
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 99999,
                            padding: 20
                        }}
                        onClick={() => setShowImportModal(false)}
                    >
                        <div
                            style={{
                                background: 'white',
                                borderRadius: 16,
                                width: '100%',
                                maxWidth: 600,
                                maxHeight: '80vh',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{
                                padding: '20px 24px',
                                borderBottom: '1px solid #e2e8f0',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>📥 导入新文章</h2>
                                <button
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        fontSize: '1.5rem',
                                        cursor: 'pointer',
                                        color: '#94a3b8',
                                        padding: 4
                                    }}
                                    onClick={() => setShowImportModal(false)}
                                >×</button>
                            </div>
                            <div style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
                                <div className="import-tabs">
                                    <button
                                        className={`import-tab ${importType === 'text' ? 'active' : ''}`}
                                        onClick={() => setImportType('text')}
                                    >
                                        ✏️ 文本粘贴
                                    </button>
                                    <button
                                        className={`import-tab ${importType === 'pdf' ? 'active' : ''}`}
                                        onClick={() => setImportType('pdf')}
                                    >
                                        📄 PDF 上传
                                    </button>
                                </div>

                                {importType === 'text' ? (
                                    <>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#374151' }}>
                                                文章标题
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="例如：The Great Gatsby - Chapter 1"
                                                value={importTitle}
                                                onChange={e => setImportTitle(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px 16px',
                                                    border: '2px solid #e5e7eb',
                                                    borderRadius: 10,
                                                    fontSize: '1rem',
                                                    boxSizing: 'border-box'
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#374151' }}>
                                                文章内容
                                            </label>
                                            <textarea
                                                placeholder="粘贴您想要阅读的英文文章内容..."
                                                value={importContent}
                                                onChange={e => setImportContent(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px 16px',
                                                    border: '2px solid #e5e7eb',
                                                    borderRadius: 10,
                                                    fontSize: '1rem',
                                                    minHeight: 200,
                                                    resize: 'vertical',
                                                    boxSizing: 'border-box',
                                                    fontFamily: 'inherit'
                                                }}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div className="file-upload-area">
                                        <input
                                            type="file"
                                            className="file-input"
                                            accept=".pdf"
                                            onChange={(e) => setImportFile(e.target.files[0])}
                                        />
                                        <div style={{ pointerEvents: 'none' }}>
                                            <div style={{ fontSize: '2rem', marginBottom: 12 }}>📄</div>
                                            {importFile ? (
                                                <div>
                                                    <div style={{ fontWeight: 600, color: '#1e293b' }}>
                                                        {importFile.name}
                                                    </div>
                                                    <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
                                                        {(importFile.size / 1024 / 1024).toFixed(2)} MB
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div style={{ fontWeight: 600, color: '#1e293b' }}>
                                                        点击或拖拽 PDF 文件到这里
                                                    </div>
                                                    <div style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: 4 }}>
                                                        支持文字版 PDF (最大 10MB)
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div style={{
                                padding: '16px 24px',
                                borderTop: '1px solid #e2e8f0',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: 12
                            }}>
                                <button
                                    onClick={() => setShowImportModal(false)}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: 8,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        background: '#f1f5f9',
                                        border: 'none',
                                        color: '#64748b'
                                    }}
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleImport}
                                    disabled={importing}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: 8,
                                        fontWeight: 600,
                                        cursor: importing ? 'not-allowed' : 'pointer',
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        border: 'none',
                                        color: 'white',
                                        opacity: importing ? 0.6 : 1
                                    }}
                                >
                                    {importing ? '导入中...' : '确认导入'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
}
