/**
 * TTS Service - 实时文本转语音
 * 调用后端 Edge TTS API
 */

const TTS_SERVER_URL = 'http://localhost:8000';

export const ttsService = {
    /**
     * 将文本转换为语音并返回 Audio 对象
     * @param {string} text - 要朗读的文本
     * @param {string} voice - 声音类型 (narrator, female, male, female_us)
     * @returns {Promise<HTMLAudioElement>} - Audio 元素
     */
    async speak(text, voice = 'narrator') {
        if (!text || !text.trim()) {
            throw new Error('Text cannot be empty');
        }

        // 停止当前正在播放的音频
        if (window.currentTTSAudio) {
            window.currentTTSAudio.pause();
            window.currentTTSAudio = null;
        }

        try {
            const response = await fetch(`${TTS_SERVER_URL}/tts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text, voice }),
            });

            if (!response.ok) {
                throw new Error(`TTS server error: ${response.status}`);
            }

            // 获取音频数据并创建 Blob URL
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);

            const audio = new Audio(audioUrl);
            window.currentTTSAudio = audio; // Track global instance

            // 播放结束后释放 Blob URL
            audio.addEventListener('ended', () => {
                URL.revokeObjectURL(audioUrl);
                if (window.currentTTSAudio === audio) {
                    window.currentTTSAudio = null;
                }
            });

            return audio;

        } catch (error) {
            console.error('TTS Error:', error);
            throw error;
        }
    },

    /**
     * 检查 TTS 服务是否可用
     * @returns {Promise<boolean>}
     */
    async isAvailable() {
        try {
            const response = await fetch(`${TTS_SERVER_URL}/`, {
                method: 'GET',
                mode: 'cors',
            });
            return response.ok;
        } catch {
            return false;
        }
    },

    /**
     * 获取可用的声音列表
     * @returns {Promise<object>}
     */
    async getVoices() {
        const response = await fetch(`${TTS_SERVER_URL}/voices`);
        return response.json();
    }
};
