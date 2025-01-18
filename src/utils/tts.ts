// 获取 TTS 音频 URL
export async function getTTSAudio(word: string): Promise<HTMLAudioElement> {
  const cacheKey = `tts_${word}`;
  const cachedUrl = localStorage.getItem(cacheKey);
  const audioElement = document.getElementById('tts-audio') as HTMLAudioElement;

  // 重置音频元素
  audioElement.pause();
  audioElement.currentTime = 0;

  if (cachedUrl) {
    try {
      await loadAudio(audioElement, cachedUrl);
      return audioElement;
    } catch (error) {
      localStorage.removeItem(cacheKey);
    }
  }

  const params = new URLSearchParams({
    input: word,
    voice: 'zh-CN-YunxiaNeural',
    rate: '-30',
  });

  const url = `https://tts.mzzsfy.eu.org/v1/audio/speech?${params.toString()}`;

  try {
    await loadAudio(audioElement, url);
    localStorage.setItem(cacheKey, url);
    return audioElement;
  } catch (error) {
    console.error('TTS URL validation failed:', error);
    throw new Error('无法获取语音，请检查网络连接或稍后重试');
  }
}

// 加载音频
async function loadAudio(audio: HTMLAudioElement, url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const onCanPlay = () => {
      audio.removeEventListener('canplaythrough', onCanPlay);
      audio.removeEventListener('error', onError);
      resolve();
    };

    const onError = () => {
      audio.removeEventListener('canplaythrough', onCanPlay);
      audio.removeEventListener('error', onError);
      reject(new Error('音频加载失败'));
    };

    audio.addEventListener('canplaythrough', onCanPlay);
    audio.addEventListener('error', onError);

    audio.src = url;
    audio.load(); // 强制加载
  });
}
