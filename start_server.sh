#!/bin/bash
# Edge TTS Server 启动脚本

echo "🚀 Starting Edge TTS Server..."

# 检查并安装依赖
pip install fastapi uvicorn edge-tts --quiet

# 启动服务器
echo "✅ Server starting at http://localhost:8000"
echo "📖 API Docs: http://localhost:8000/docs"
echo ""
uvicorn server:app --reload --port 8000
