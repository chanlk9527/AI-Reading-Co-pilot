import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';
import EpubJsReader from './EpubJsReader';

const COMPAT_RENDER_TIMEOUT_MS = 15000;
const ENHANCED_STYLE_ID = 'epub-enhanced-controls-style';
const ENHANCED_SCRIPT_FLAG = 'data-epub-enhanced-script';

const ENHANCED_READER_STYLE = `
<style id="${ENHANCED_STYLE_ID}">
:root{
    --epub-ui-bg: rgba(255,255,255,0.92);
    --epub-ui-border: rgba(15,23,42,0.12);
    --epub-ui-shadow: rgba(15,23,42,0.14);
    --epub-custom-font-family: 'Iowan Old Style','Palatino Linotype','Book Antiqua',Palatino,serif;
}
body.epub-enhanced-ready{
    padding-top: 64px;
}
body.epub-enhanced-ready .epub-reader-root{
    max-width: min(var(--epub-content-width, 760px), calc(100vw - 38px));
    font-size: var(--epub-font-size, 100%);
    line-height: var(--epub-line-height, 1.75);
    transition: max-width 180ms ease, font-size 140ms ease, line-height 140ms ease, margin 200ms ease;
}
body.epub-enhanced-ready.epub-enhanced-custom-font .epub-reader-root,
body.epub-enhanced-ready.epub-enhanced-custom-font .epub-reader-root *{
    font-family: var(--epub-custom-font-family) !important;
}
.epub-enhanced-toolbar{
    position: fixed;
    top: 10px;
    left: 10px;
    right: 10px;
    z-index: 2000;
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid var(--epub-ui-border);
    background: var(--epub-ui-bg);
    backdrop-filter: blur(12px);
    box-shadow: 0 10px 28px var(--epub-ui-shadow);
    color: #0f172a;
}
.epub-enhanced-control{
    display: inline-flex;
    gap: 6px;
    align-items: center;
    font-size: 12px;
    color: #334155;
}
.epub-enhanced-control > span{
    font-weight: 700;
    letter-spacing: 0.02em;
}
.epub-enhanced-control select,
.epub-enhanced-control input[type="range"]{
    accent-color: #0f172a;
}
.epub-enhanced-control select{
    height: 30px;
    border-radius: 8px;
    border: 1px solid rgba(15,23,42,0.16);
    background: rgba(255,255,255,0.92);
    color: #0f172a;
    padding: 0 8px;
}
.epub-enhanced-btn{
    border: 1px solid rgba(15,23,42,0.18);
    background: rgba(255,255,255,0.88);
    color: #0f172a;
    border-radius: 9px;
    min-height: 30px;
    padding: 0 10px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
}
.epub-enhanced-btn:hover{
    background: #0f172a;
    color: #f8fafc;
}
.epub-enhanced-progress{
    margin-left: auto;
    min-height: 30px;
    border: 1px solid rgba(15,23,42,0.16);
    background: rgba(255,255,255,0.86);
    color: #334155;
    border-radius: 999px;
    padding: 0 10px;
    display: inline-flex;
    align-items: center;
    font-size: 12px;
    font-weight: 700;
}
.epub-enhanced-toc{
    position: fixed;
    top: 74px;
    left: 10px;
    bottom: 10px;
    width: 300px;
    z-index: 1990;
    border-radius: 12px;
    border: 1px solid var(--epub-ui-border);
    background: rgba(248,250,252,0.98);
    box-shadow: 0 16px 36px rgba(15,23,42,0.15);
    transform: translateX(-115%);
    transition: transform 220ms ease;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}
body.epub-enhanced-toc-open .epub-enhanced-toc{
    transform: translateX(0);
}
.epub-enhanced-toc-header{
    min-height: 42px;
    border-bottom: 1px solid rgba(15,23,42,0.12);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    font-size: 12px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: 0.03em;
}
.epub-enhanced-toc-list{
    margin: 0;
    padding: 8px 8px 16px;
    list-style: none;
    overflow: auto;
}
.epub-enhanced-toc-link{
    width: 100%;
    border: none;
    background: transparent;
    border-radius: 8px;
    text-align: left;
    padding: 8px 10px;
    cursor: pointer;
    color: #334155;
    font-size: 13px;
    line-height: 1.4;
}
.epub-enhanced-toc-link:hover{
    background: rgba(15,23,42,0.08);
    color: #0f172a;
}
.epub-enhanced-toc-link.active{
    background: #0f172a;
    color: #f8fafc;
}
@media (min-width: 1220px){
    body.epub-enhanced-toc-open .epub-reader-root{
        margin-left: 340px;
        margin-right: 20px;
    }
}
@media (max-width: 860px){
    body.epub-enhanced-ready{
        padding-top: 112px;
    }
    .epub-enhanced-toolbar{
        left: 6px;
        right: 6px;
        top: 6px;
        padding: 8px;
    }
    .epub-enhanced-toc{
        top: 118px;
        left: 6px;
        right: 6px;
        width: auto;
    }
    .epub-enhanced-progress{
        margin-left: 0;
    }
}
</style>
`;

const ENHANCED_READER_SCRIPT = `
<script ${ENHANCED_SCRIPT_FLAG}="1">
(function(){
    if (!document || !document.body || document.body.dataset.epubEnhancedInit === '1') {
        return;
    }
    document.body.dataset.epubEnhancedInit = '1';

    var readerRoot = document.querySelector('.epub-reader-root');
    if (!readerRoot) {
        return;
    }

    var sections = Array.prototype.slice.call(readerRoot.querySelectorAll('.epub-reader-section'));
    if (!sections.length) {
        return;
    }

    var storageKey = 'epub_reader_controls_v2';
    var defaults = {
        fontFamily: 'publisher',
        fontSize: 100,
        lineHeight: 1.75,
        contentWidth: 760,
        tocOpen: false
    };

    var fontFamilies = {
        publisher: '',
        iowan: "'Iowan Old Style','Palatino Linotype','Book Antiqua',Palatino,serif",
        literata: "'Literata','Baskerville','Times New Roman',serif",
        charter: "'Charter','Georgia','Times New Roman',serif",
        sans: "'Avenir Next','Helvetica Neue',Arial,sans-serif"
    };

    var saved = null;
    try {
        saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    } catch (err) {
        saved = null;
    }

    var state = Object.assign({}, defaults, saved || {});

    var clampNumber = function(value, min, max, fallback) {
        var n = Number(value);
        if (!Number.isFinite(n)) return fallback;
        return Math.min(max, Math.max(min, n));
    };

    var sectionMeta = sections.map(function(section, index) {
        var seq = index + 1;
        if (!section.id) {
            section.id = 'epub-section-' + seq;
        }
        section.dataset.sectionSeq = String(seq);
        var titleNode = section.querySelector('.epub-reader-section-title, h1, h2, h3');
        var title = titleNode && titleNode.textContent ? titleNode.textContent.trim() : '';
        if (!title) {
            title = 'Section ' + seq;
        }
        return {
            id: section.id,
            title: title
        };
    });

    var toolbar = document.createElement('div');
    toolbar.className = 'epub-enhanced-toolbar';
    toolbar.innerHTML = [
        '<button class="epub-enhanced-btn" type="button" data-role="toggle-toc">目录</button>',
        '<label class="epub-enhanced-control"><span>字体</span><select data-role="font-family">',
        '<option value="publisher">Publisher</option>',
        '<option value="iowan">Iowan</option>',
        '<option value="literata">Literata</option>',
        '<option value="charter">Charter</option>',
        '<option value="sans">Sans</option>',
        '</select></label>',
        '<label class="epub-enhanced-control"><span>字号</span><input data-role="font-size" type="range" min="85" max="150" step="1" /></label>',
        '<label class="epub-enhanced-control"><span>行距</span><input data-role="line-height" type="range" min="1.4" max="2.2" step="0.05" /></label>',
        '<label class="epub-enhanced-control"><span>宽度</span><input data-role="content-width" type="range" min="560" max="980" step="10" /></label>',
        '<button class="epub-enhanced-btn" type="button" data-role="reset-style">重置样式</button>',
        '<span class="epub-enhanced-progress" data-role="progress">1 / ',
        String(sectionMeta.length),
        '</span>'
    ].join('');
    document.body.appendChild(toolbar);

    var toc = document.createElement('aside');
    toc.className = 'epub-enhanced-toc';
    toc.innerHTML = '<div class="epub-enhanced-toc-header">CONTENTS<button class="epub-enhanced-btn" type="button" data-role="close-toc">关闭</button></div>';
    var tocList = document.createElement('ol');
    tocList.className = 'epub-enhanced-toc-list';

    sectionMeta.forEach(function(item, index) {
        var listItem = document.createElement('li');
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'epub-enhanced-toc-link';
        btn.dataset.sectionTarget = item.id;
        btn.dataset.sectionIndex = String(index + 1);
        btn.textContent = item.title;
        listItem.appendChild(btn);
        tocList.appendChild(listItem);
    });

    toc.appendChild(tocList);
    document.body.appendChild(toc);

    var progressNode = toolbar.querySelector('[data-role="progress"]');
    var fontFamilyInput = toolbar.querySelector('[data-role="font-family"]');
    var fontSizeInput = toolbar.querySelector('[data-role="font-size"]');
    var lineHeightInput = toolbar.querySelector('[data-role="line-height"]');
    var contentWidthInput = toolbar.querySelector('[data-role="content-width"]');
    var toggleTocBtn = toolbar.querySelector('[data-role="toggle-toc"]');
    var closeTocBtn = toc.querySelector('[data-role="close-toc"]');
    var resetBtn = toolbar.querySelector('[data-role="reset-style"]');
    var tocButtons = Array.prototype.slice.call(toc.querySelectorAll('.epub-enhanced-toc-link'));

    var persist = function() {
        try {
            localStorage.setItem(storageKey, JSON.stringify(state));
        } catch (err) {
            // ignore storage exceptions
        }
    };

    var setTocOpen = function(isOpen) {
        state.tocOpen = Boolean(isOpen);
        document.body.classList.toggle('epub-enhanced-toc-open', state.tocOpen);
        persist();
    };

    var applyStyleState = function() {
        state.fontSize = clampNumber(state.fontSize, 85, 150, defaults.fontSize);
        state.lineHeight = clampNumber(state.lineHeight, 1.4, 2.2, defaults.lineHeight);
        state.contentWidth = clampNumber(state.contentWidth, 560, 980, defaults.contentWidth);
        if (!fontFamilies[state.fontFamily]) {
            state.fontFamily = defaults.fontFamily;
        }

        readerRoot.style.setProperty('--epub-font-size', state.fontSize + '%');
        readerRoot.style.setProperty('--epub-line-height', String(state.lineHeight));
        readerRoot.style.setProperty('--epub-content-width', state.contentWidth + 'px');

        document.documentElement.style.setProperty(
            '--epub-custom-font-family',
            fontFamilies[state.fontFamily] || fontFamilies.iowan
        );
        document.body.classList.add('epub-enhanced-ready');
        document.body.classList.toggle('epub-enhanced-custom-font', state.fontFamily !== 'publisher');
        document.body.classList.toggle('epub-enhanced-publisher-font', state.fontFamily === 'publisher');

        fontFamilyInput.value = state.fontFamily;
        fontSizeInput.value = String(Math.round(state.fontSize));
        lineHeightInput.value = String(Number(state.lineHeight).toFixed(2));
        contentWidthInput.value = String(Math.round(state.contentWidth));
        setTocOpen(state.tocOpen);
        persist();
    };

    var activeSection = 1;
    var setActiveSection = function(index) {
        activeSection = clampNumber(index, 1, sectionMeta.length, 1);
        tocButtons.forEach(function(btn) {
            var isActive = Number(btn.dataset.sectionIndex || 0) === activeSection;
            btn.classList.toggle('active', isActive);
        });
        progressNode.textContent = activeSection + ' / ' + sectionMeta.length;
    };

    var scrollToSection = function(index) {
        var target = sections[index - 1];
        if (!target) return;
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActiveSection(index);
    };

    var observer = new IntersectionObserver(
        function(entries) {
            var visible = entries
                .filter(function(entry) { return entry.isIntersecting; })
                .sort(function(a, b) { return b.intersectionRatio - a.intersectionRatio; });
            if (!visible.length) return;
            var seq = Number(visible[0].target.dataset.sectionSeq || 1);
            setActiveSection(seq);
        },
        {
            root: null,
            threshold: [0.2, 0.4, 0.6],
            rootMargin: '-12% 0px -58% 0px'
        }
    );
    sections.forEach(function(section) { observer.observe(section); });

    tocButtons.forEach(function(btn) {
        btn.addEventListener('click', function() {
            var targetIndex = Number(btn.dataset.sectionIndex || 0);
            scrollToSection(targetIndex);
            if (window.matchMedia('(max-width: 1220px)').matches) {
                setTocOpen(false);
            }
        });
    });

    fontFamilyInput.addEventListener('change', function() {
        state.fontFamily = String(fontFamilyInput.value || defaults.fontFamily);
        applyStyleState();
    });
    fontSizeInput.addEventListener('input', function() {
        state.fontSize = clampNumber(fontSizeInput.value, 85, 150, defaults.fontSize);
        applyStyleState();
    });
    lineHeightInput.addEventListener('input', function() {
        state.lineHeight = clampNumber(lineHeightInput.value, 1.4, 2.2, defaults.lineHeight);
        applyStyleState();
    });
    contentWidthInput.addEventListener('input', function() {
        state.contentWidth = clampNumber(contentWidthInput.value, 560, 980, defaults.contentWidth);
        applyStyleState();
    });

    toggleTocBtn.addEventListener('click', function() {
        setTocOpen(!state.tocOpen);
    });
    closeTocBtn.addEventListener('click', function() {
        setTocOpen(false);
    });
    resetBtn.addEventListener('click', function() {
        state = Object.assign({}, defaults, { tocOpen: state.tocOpen });
        applyStyleState();
    });

    readerRoot.addEventListener('click', function(event) {
        var anchor = event.target && event.target.closest ? event.target.closest('a[href]') : null;
        if (!anchor) return;
        var href = String(anchor.getAttribute('href') || '').trim();
        if (!href || href[0] === '#') return;

        var hashIndex = href.indexOf('#');
        if (hashIndex < 0) return;
        var fragment = href.slice(hashIndex + 1);
        if (!fragment) return;
        var target = document.getElementById(fragment);
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    applyStyleState();
    setActiveSection(1);
})();
</script>
`;

function withTimeout(promise, timeoutMs, timeoutMessage) {
    let timer = null;
    const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
        if (timer !== null) {
            clearTimeout(timer);
        }
    });
}

function injectBeforeClosingTag(htmlDoc, tagName, snippet) {
    if (!htmlDoc || !snippet) return htmlDoc;
    const pattern = new RegExp(`</${tagName}>`, 'i');
    const match = pattern.exec(htmlDoc);
    if (!match) return `${htmlDoc}${snippet}`;
    return `${htmlDoc.slice(0, match.index)}${snippet}${htmlDoc.slice(match.index)}`;
}

function buildEnhancedReaderHtml(rawHtml) {
    if (!rawHtml || !rawHtml.trim()) return '';

    let enhanced = rawHtml;
    if (!enhanced.includes(ENHANCED_STYLE_ID)) {
        enhanced = injectBeforeClosingTag(enhanced, 'head', ENHANCED_READER_STYLE);
    }
    if (!enhanced.includes(ENHANCED_SCRIPT_FLAG)) {
        enhanced = injectBeforeClosingTag(enhanced, 'body', ENHANCED_READER_SCRIPT);
    }
    return enhanced;
}

export default function EpubRawReader({ title, textId, token }) {
    const [compatHtml, setCompatHtml] = useState('');
    const [enhancedHtml, setEnhancedHtml] = useState('');
    const [compatLoading, setCompatLoading] = useState(true);
    const [compatError, setCompatError] = useState('');
    const [viewMode, setViewMode] = useState('epubjs');
    const [epubJsReloadToken, setEpubJsReloadToken] = useState(0);

    const loadCompatReader = useCallback(async () => {
        if (!token || !textId) {
            setCompatHtml('');
            setEnhancedHtml('');
            setCompatError('缺少 EPUB 阅读上下文，无法加载兼容阅读模式。');
            setCompatLoading(false);
            return;
        }

        setCompatLoading(true);
        setCompatError('');
        setCompatHtml('');
        setEnhancedHtml('');

        try {
            const htmlDoc = await withTimeout(
                api.getRawEpubFallbackHtml(token, textId),
                COMPAT_RENDER_TIMEOUT_MS,
                'EPUB compatibility render timeout'
            );

            if (!htmlDoc || !htmlDoc.trim()) {
                setCompatError('兼容阅读模式未返回有效内容。');
                return;
            }

            setCompatHtml(htmlDoc);
            const upgradedHtml = buildEnhancedReaderHtml(htmlDoc);
            setEnhancedHtml(upgradedHtml);
        } catch (err) {
            console.error('Failed to load EPUB compatibility reader:', err);
            const timeoutError = /timeout/i.test(err?.message || '');
            setCompatError(timeoutError ? '兼容阅读模式加载超时，请重试。' : '兼容阅读模式加载失败，请重试。');
        } finally {
            setCompatLoading(false);
        }
    }, [textId, token]);

    useEffect(() => {
        loadCompatReader();
    }, [loadCompatReader]);

    const hasEnhancedView = Boolean(enhancedHtml);
    const needsCompatFrame = viewMode === 'enhanced' || viewMode === 'compat';
    const activeHtml = useMemo(() => {
        if (viewMode === 'enhanced' && hasEnhancedView) return enhancedHtml;
        return compatHtml;
    }, [viewMode, hasEnhancedView, enhancedHtml, compatHtml]);

    useEffect(() => {
        if (viewMode === 'enhanced' && !hasEnhancedView && compatHtml) {
            setViewMode('compat');
        }
    }, [viewMode, hasEnhancedView, compatHtml]);

    useEffect(() => {
        if (!needsCompatFrame) return;
        if (compatLoading) return;
        if (compatHtml || compatError) return;
        loadCompatReader();
    }, [needsCompatFrame, compatLoading, compatHtml, compatError, loadCompatReader]);

    return (
        <div className="epub-compat-root">
            <div className="epub-compat-toolbar">
                <div className="epub-compat-title">{title || 'EPUB Reader'}</div>
                <div className="epub-compat-meta">
                    <div className="epub-compat-mode-switch">
                        <button
                            className={`epub-compat-mode-btn ${viewMode === 'epubjs' ? 'active' : ''}`}
                            type="button"
                            onClick={() => setViewMode('epubjs')}
                        >
                            EPUB.js 专业
                        </button>
                        <button
                            className={`epub-compat-mode-btn ${viewMode === 'enhanced' ? 'active' : ''}`}
                            type="button"
                            onClick={() => setViewMode('enhanced')}
                            disabled={!hasEnhancedView}
                        >
                            增强兼容
                        </button>
                        <button
                            className={`epub-compat-mode-btn ${viewMode === 'compat' ? 'active' : ''}`}
                            type="button"
                            onClick={() => setViewMode('compat')}
                        >
                            原始兼容
                        </button>
                    </div>
                    <span className="epub-compat-chip">
                        {viewMode === 'epubjs' ? '专业引擎（字体/目录/分页）' : viewMode === 'enhanced' ? '增强兼容（保留旧解析）' : '原始输出'}
                    </span>
                    <button
                        className="epub-compat-refresh"
                        onClick={() => {
                            if (viewMode === 'epubjs') {
                                setEpubJsReloadToken((prev) => prev + 1);
                            } else {
                                loadCompatReader();
                            }
                        }}
                        disabled={viewMode !== 'epubjs' && compatLoading}
                        type="button"
                    >
                        刷新
                    </button>
                </div>
            </div>

            <div className="epub-compat-stage">
                {viewMode === 'epubjs' ? (
                    <EpubJsReader
                        textId={textId}
                        token={token}
                        reloadToken={epubJsReloadToken}
                        onRequestFallback={() => setViewMode('enhanced')}
                    />
                ) : null}

                {viewMode !== 'epubjs' && compatLoading ? <div className="epub-compat-status">正在加载兼容阅读模式...</div> : null}

                {viewMode !== 'epubjs' && !compatLoading && compatError ? <div className="epub-compat-status error">{compatError}</div> : null}

                {viewMode !== 'epubjs' && !compatLoading && !compatError && activeHtml ? (
                    <iframe
                        className="epub-compat-frame"
                        title={`${title || 'EPUB Reader'} frame`}
                        srcDoc={activeHtml}
                    />
                ) : null}

                {viewMode !== 'epubjs' && !compatLoading && !compatError && !activeHtml ? (
                    <div className="epub-compat-status">阅读内容为空，请刷新重试。</div>
                ) : null}
            </div>
        </div>
    );
}
