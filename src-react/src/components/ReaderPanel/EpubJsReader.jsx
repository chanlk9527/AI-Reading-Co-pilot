import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../services/api';

const EPUBJS_LOAD_TIMEOUT_MS = 22000;
const EPUBJS_PREFS_KEY = 'epubjs_reader_prefs_v1';

const FONT_PRESETS = [
    { key: 'publisher', label: 'Publisher', css: '' },
    { key: 'iowan', label: 'Iowan', css: "'Iowan Old Style','Palatino Linotype','Book Antiqua',Palatino,serif" },
    { key: 'literata', label: 'Literata', css: "'Literata','Baskerville','Times New Roman',serif" },
    { key: 'charter', label: 'Charter', css: "'Charter','Georgia','Times New Roman',serif" },
    { key: 'sans', label: 'Sans', css: "'Avenir Next','Helvetica Neue',Arial,sans-serif" },
];

const DEFAULT_SETTINGS = {
    fontKey: 'iowan',
    fontSize: 105,
    lineHeight: 1.75,
    flowMode: 'paginated',
};

function resolveFontCss(fontKey) {
    return FONT_PRESETS.find((font) => font.key === fontKey)?.css || '';
}

function loadPrefs() {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
        const raw = window.localStorage.getItem(EPUBJS_PREFS_KEY);
        if (!raw) return DEFAULT_SETTINGS;
        const parsed = JSON.parse(raw);
        return {
            ...DEFAULT_SETTINGS,
            ...(parsed && typeof parsed === 'object' ? parsed : {}),
        };
    } catch {
        return DEFAULT_SETTINGS;
    }
}

function withTimeout(promise, timeoutMs, timeoutMessage) {
    let timer = null;
    const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
        if (timer !== null) clearTimeout(timer);
    });
}

function clamp(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
}

function normalizeHref(href) {
    const candidate = String(href || '').trim();
    if (!candidate) return '';
    const hashIndex = candidate.indexOf('#');
    if (hashIndex >= 0) return candidate.slice(0, hashIndex);
    return candidate;
}

function flattenToc(items, depth = 0, list = []) {
    if (!Array.isArray(items) || items.length === 0) return list;

    items.forEach((item) => {
        if (!item) return;
        const href = String(item.href || '').trim();
        const labelRaw = String(item.label || item.title || '').trim();
        const label = labelRaw || `Section ${list.length + 1}`;
        if (href) {
            list.push({
                href,
                label,
                depth,
                normalizedHref: normalizeHref(href),
            });
        }
        if (Array.isArray(item.subitems) && item.subitems.length > 0) {
            flattenToc(item.subitems, depth + 1, list);
        }
    });

    return list;
}

function applyTypographyToRendition(rendition, readerSettings) {
    if (!rendition) return;
    const fontCss = resolveFontCss(readerSettings?.fontKey);
    const fontSize = clamp(readerSettings?.fontSize, 85, 150, DEFAULT_SETTINGS.fontSize);
    const lineHeight = clamp(readerSettings?.lineHeight, 1.4, 2.2, DEFAULT_SETTINGS.lineHeight);

    rendition.themes.fontSize(`${fontSize}%`);
    rendition.themes.font(fontCss || '');
    rendition.themes.override('line-height', String(lineHeight));
    rendition.themes.override('word-break', 'normal');
    rendition.themes.override('hyphens', 'auto');
}

export default function EpubJsReader({
    textId,
    token,
    reloadToken = 0,
    onRequestFallback,
}) {
    const renditionHostRef = useRef(null);
    const bookRef = useRef(null);
    const renditionRef = useRef(null);
    const currentCfiRef = useRef('');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [tocEntries, setTocEntries] = useState([]);
    const [tocOpen, setTocOpen] = useState(false);
    const [activeHref, setActiveHref] = useState('');
    const [progressPct, setProgressPct] = useState(null);
    const [settings, setSettings] = useState(loadPrefs);
    const settingsRef = useRef(settings);

    const destroyReader = useCallback(() => {
        const rendition = renditionRef.current;
        if (rendition) {
            try {
                rendition.destroy();
            } catch {
                // Ignore cleanup exceptions from third-party internals.
            }
        }
        renditionRef.current = null;

        const book = bookRef.current;
        if (book) {
            try {
                book.destroy();
            } catch {
                // Ignore cleanup exceptions from third-party internals.
            }
        }
        bookRef.current = null;
        currentCfiRef.current = '';

        if (renditionHostRef.current) {
            renditionHostRef.current.innerHTML = '';
        }
    }, []);

    const applyTypography = useCallback(() => {
        const rendition = renditionRef.current;
        if (!rendition) return;

        try {
            applyTypographyToRendition(rendition, settingsRef.current);
        } catch (err) {
            console.warn('Failed to apply EPUB.js typography settings:', err);
        }
    }, []);

    useEffect(() => {
        settingsRef.current = settings;
    }, [settings]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            window.localStorage.setItem(EPUBJS_PREFS_KEY, JSON.stringify(settings));
        } catch {
            // Ignore storage failures in private mode.
        }
    }, [settings]);

    useEffect(() => {
        applyTypography();
    }, [settings.fontKey, settings.fontSize, settings.lineHeight, applyTypography]);

    useEffect(() => {
        const rendition = renditionRef.current;
        if (!rendition) return;

        const nextFlow = settings.flowMode === 'scroll' ? 'scrolled-doc' : 'paginated';
        try {
            rendition.flow(nextFlow);
            if (currentCfiRef.current) {
                rendition.display(currentCfiRef.current).catch(() => {
                    // Keep current position best-effort when switching flow.
                });
            }
        } catch (err) {
            console.warn('Failed to switch EPUB.js flow mode:', err);
        }
    }, [settings.flowMode]);

    useEffect(() => {
        let cancelled = false;

        const initReader = async () => {
            if (!token || !textId) {
                setLoading(false);
                setError('缺少 EPUB 阅读上下文，无法启动 EPUB.js。');
                return;
            }

            if (!renditionHostRef.current) {
                setLoading(false);
                setError('EPUB.js 容器未准备好。');
                return;
            }

            setLoading(true);
            setError('');
            setTocEntries([]);
            setActiveHref('');
            setProgressPct(null);

            destroyReader();

            try {
                const module = await withTimeout(
                    import('epubjs'),
                    EPUBJS_LOAD_TIMEOUT_MS,
                    'EPUB.js module load timeout'
                );
                const ePubFactory = module?.default || module;
                if (typeof ePubFactory !== 'function') {
                    throw new Error('EPUB.js module is invalid');
                }

                const { blob } = await withTimeout(
                    api.getRawAssetBlob(token, textId),
                    EPUBJS_LOAD_TIMEOUT_MS,
                    'Raw EPUB fetch timeout'
                );
                const arrayBuffer = await blob.arrayBuffer();
                if (cancelled) return;

                const book = ePubFactory(arrayBuffer);
                bookRef.current = book;

                const rendition = book.renderTo(renditionHostRef.current, {
                    width: '100%',
                    height: '100%',
                    spread: 'auto',
                    flow: settingsRef.current.flowMode === 'scroll' ? 'scrolled-doc' : 'paginated',
                    allowScriptedContent: true,
                });
                renditionRef.current = rendition;

                rendition.hooks.content.register((contents) => {
                    contents.addStylesheetRules({
                        img: { 'max-width': '100%', height: 'auto' },
                        svg: { 'max-width': '100%', height: 'auto' },
                        video: { 'max-width': '100%', height: 'auto' },
                        table: { width: '100%' },
                    });
                });

                rendition.on('relocated', (location) => {
                    if (cancelled) return;
                    const currentCfi = String(location?.start?.cfi || '').trim();
                    currentCfiRef.current = currentCfi;

                    const currentHref = normalizeHref(location?.start?.href || '');
                    if (currentHref) {
                        setActiveHref(currentHref);
                    }

                    const bookInstance = bookRef.current;
                    if (!bookInstance?.locations || !currentCfi) return;
                    const percentage = bookInstance.locations.percentageFromCfi(currentCfi);
                    if (Number.isFinite(percentage)) {
                        setProgressPct(Math.max(0, Math.min(100, Math.round(percentage * 100))));
                    }
                });

                await withTimeout(
                    rendition.display(),
                    EPUBJS_LOAD_TIMEOUT_MS,
                    'EPUB.js display timeout'
                );
                if (cancelled) return;

                applyTypographyToRendition(rendition, settingsRef.current);

                try {
                    const navigation = await book.loaded.navigation;
                    if (!cancelled) {
                        const flattened = flattenToc(navigation?.toc || []);
                        setTocEntries(flattened);
                        if (flattened.length > 0) {
                            setActiveHref((prev) => prev || flattened[0].normalizedHref);
                        }
                    }
                } catch (navErr) {
                    console.warn('Failed to load EPUB.js TOC:', navErr);
                }

                try {
                    await book.ready;
                    await book.locations.generate(1500);
                } catch (locErr) {
                    console.warn('Failed to generate EPUB.js locations:', locErr);
                }
            } catch (err) {
                if (cancelled) return;
                console.error('EPUB.js reader init failed:', err);
                setError('EPUB.js 加载失败，请切换到兼容模式。');
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        initReader();
        return () => {
            cancelled = true;
            destroyReader();
        };
    }, [token, textId, reloadToken, destroyReader]);

    useEffect(() => {
        const handleKeydown = (event) => {
            if (event.defaultPrevented) return;
            const tagName = String(event.target?.tagName || '').toLowerCase();
            if (tagName === 'input' || tagName === 'select' || tagName === 'textarea') return;

            const rendition = renditionRef.current;
            if (!rendition) return;

            if (event.key === 'ArrowRight') {
                rendition.next();
            } else if (event.key === 'ArrowLeft') {
                rendition.prev();
            }
        };

        window.addEventListener('keydown', handleKeydown);
        return () => window.removeEventListener('keydown', handleKeydown);
    }, []);

    const goPrev = useCallback(() => {
        renditionRef.current?.prev();
    }, []);

    const goNext = useCallback(() => {
        renditionRef.current?.next();
    }, []);

    const jumpToToc = useCallback((entry) => {
        if (!entry?.href) return;
        renditionRef.current?.display(entry.href);
        if (window.matchMedia('(max-width: 1000px)').matches) {
            setTocOpen(false);
        }
    }, []);

    const activeLabel = useMemo(() => {
        if (!activeHref) return 'Section';
        const match = tocEntries.find((entry) => entry.normalizedHref === activeHref);
        return match?.label || 'Section';
    }, [tocEntries, activeHref]);

    return (
        <div className="epubjs-reader-root">
            <div className="epubjs-toolbar">
                <div className="epubjs-toolbar-group">
                    <button className="epubjs-btn" type="button" onClick={goPrev}>上一页</button>
                    <button className="epubjs-btn" type="button" onClick={goNext}>下一页</button>
                    <button
                        className={`epubjs-btn ${tocOpen ? 'active' : ''}`}
                        type="button"
                        onClick={() => setTocOpen((prev) => !prev)}
                    >
                        目录
                    </button>
                </div>

                <div className="epubjs-toolbar-group epubjs-toolbar-settings">
                    <label className="epubjs-control">
                        <span>字体</span>
                        <select
                            value={settings.fontKey}
                            onChange={(event) => setSettings((prev) => ({ ...prev, fontKey: event.target.value }))}
                        >
                            {FONT_PRESETS.map((font) => (
                                <option key={font.key} value={font.key}>
                                    {font.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="epubjs-control">
                        <span>字号</span>
                        <input
                            type="range"
                            min={85}
                            max={150}
                            step={1}
                            value={settings.fontSize}
                            onChange={(event) => {
                                const next = clamp(event.target.value, 85, 150, DEFAULT_SETTINGS.fontSize);
                                setSettings((prev) => ({ ...prev, fontSize: next }));
                            }}
                        />
                    </label>

                    <label className="epubjs-control">
                        <span>行距</span>
                        <input
                            type="range"
                            min={1.4}
                            max={2.2}
                            step={0.05}
                            value={settings.lineHeight}
                            onChange={(event) => {
                                const next = clamp(event.target.value, 1.4, 2.2, DEFAULT_SETTINGS.lineHeight);
                                setSettings((prev) => ({ ...prev, lineHeight: next }));
                            }}
                        />
                    </label>

                    <label className="epubjs-control">
                        <span>排版</span>
                        <select
                            value={settings.flowMode}
                            onChange={(event) => setSettings((prev) => ({ ...prev, flowMode: event.target.value }))}
                        >
                            <option value="paginated">分页</option>
                            <option value="scroll">滚动</option>
                        </select>
                    </label>
                </div>

                <div className="epubjs-toolbar-group epubjs-toolbar-meta">
                    <span className="epubjs-chip">{activeLabel}</span>
                    <span className="epubjs-chip">{progressPct == null ? '--%' : `${progressPct}%`}</span>
                    {typeof onRequestFallback === 'function' ? (
                        <button className="epubjs-btn" type="button" onClick={onRequestFallback}>
                            切到兼容模式
                        </button>
                    ) : null}
                </div>
            </div>

            <div className="epubjs-layout">
                <aside className={`epubjs-toc-panel ${tocOpen ? 'open' : ''}`}>
                    <div className="epubjs-toc-header">
                        <span>CONTENTS</span>
                        <button className="epubjs-btn" type="button" onClick={() => setTocOpen(false)}>
                            关闭
                        </button>
                    </div>
                    <ol className="epubjs-toc-list">
                        {tocEntries.length === 0 ? (
                            <li className="epubjs-toc-empty">暂无目录</li>
                        ) : (
                            tocEntries.map((entry) => (
                                <li key={`${entry.href}-${entry.depth}`}>
                                    <button
                                        className={`epubjs-toc-link ${entry.normalizedHref === activeHref ? 'active' : ''}`}
                                        style={{ paddingLeft: `${12 + entry.depth * 14}px` }}
                                        type="button"
                                        onClick={() => jumpToToc(entry)}
                                    >
                                        {entry.label}
                                    </button>
                                </li>
                            ))
                        )}
                    </ol>
                </aside>

                <div className="epubjs-stage">
                    {loading ? <div className="epubjs-status">正在加载 EPUB.js 阅读器...</div> : null}
                    {!loading && error ? (
                        <div className="epubjs-status error">
                            <div>{error}</div>
                            {typeof onRequestFallback === 'function' ? (
                                <button className="epubjs-btn" type="button" onClick={onRequestFallback}>
                                    使用兼容模式
                                </button>
                            ) : null}
                        </div>
                    ) : null}
                    <div
                        ref={renditionHostRef}
                        className={`epubjs-host ${loading || error ? 'hidden' : ''}`}
                        aria-label="EPUB.js reader container"
                    />
                </div>
            </div>
        </div>
    );
}
