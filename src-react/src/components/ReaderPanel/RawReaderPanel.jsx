export default function RawReaderPanel({
    title,
    rawAssetUrl,
    rawAssetInfo,
    loading = false,
    error = ''
}) {
    const format = String(rawAssetInfo?.format || '').toLowerCase();
    const formatLabel = format ? format.toUpperCase() : 'RAW';
    const sourceName = rawAssetInfo?.filename || '';

    return (
        <div className="reader-panel raw-reader-panel">
            <div className="raw-reader-shell">
                <div className="raw-reader-header">
                    <div className="raw-reader-title">{title || 'Raw Reader'}</div>
                    <div className="raw-reader-meta">
                        <span className="raw-reader-badge">{formatLabel}</span>
                        {sourceName ? <span className="raw-reader-file">{sourceName}</span> : null}
                    </div>
                </div>

                <div className="raw-reader-body">
                    {loading ? (
                        <div className="raw-reader-status">正在加载原始阅读器...</div>
                    ) : null}

                    {!loading && error ? (
                        <div className="raw-reader-status raw-reader-status-error">{error}</div>
                    ) : null}

                    {!loading && !error && !rawAssetInfo ? (
                        <div className="raw-reader-status">
                            当前文本没有可用的 Raw EPUB/PDF 资源，请切换到 Flow/Learn 模式。
                        </div>
                    ) : null}

                    {!loading && !error && rawAssetInfo && !rawAssetUrl ? (
                        <div className="raw-reader-status">Raw 资源已找到，但无法创建预览。</div>
                    ) : null}

                    {!loading && !error && rawAssetInfo && rawAssetUrl ? (
                        <iframe
                            className="raw-reader-frame"
                            src={rawAssetUrl}
                            title={`${title || 'Raw Reader'} frame`}
                        />
                    ) : null}
                </div>
            </div>
        </div>
    );
}
