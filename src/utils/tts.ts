// 获取 TTS 音频 URL
export async function getTTSAudio(word: string): Promise<string> {
  const cacheKey = `tts_${word}`;
  const cachedUrl = localStorage.getItem(cacheKey);

  if (cachedUrl) {
    // 验证缓存的 URL 是否可用
    try {
      await new Promise((resolve, reject) => {
        const audio = new Audio(cachedUrl);
        audio.oncanplay = resolve;
        audio.onerror = reject;
      });
      return cachedUrl;
    } catch (error) {
      // 如果缓存的 URL 不可用，删除缓存
      localStorage.removeItem(cacheKey);
    }
  }

  // 生成新的 URL
  const params = new URLSearchParams({
    input: word,
    voice: 'zh-CN-YunxiaNeural',
    rate: '-30',
  });

  const url = `https://tts.mzzsfy.eu.org/v1/audio/speech?${params.toString()}`;

  // 验证新 URL 是否可用
  try {
    await new Promise((resolve, reject) => {
      const audio = new Audio(url);
      audio.oncanplay = resolve;
      audio.onerror = reject;
    });
    // URL 可用，保存到缓存
    localStorage.setItem(cacheKey, url);
    return url;
  } catch (error) {
    console.error('TTS URL validation failed:', error);
    throw new Error('无法获取语音，请检查网络连接或稍后重试');
  }
}
