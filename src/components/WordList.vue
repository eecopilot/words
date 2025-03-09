<template>
  <div class="word-list-container">
    <div class="header">
      <el-button
        @click="handleBack"
        class="back-btn">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>

      <div class="display-mode-controls">
        <el-radio-group
          v-model="displayMode"
          size="small">
          <el-radio-button label="both">英文+中文</el-radio-button>
          <el-radio-button label="english">仅英文</el-radio-button>
          <el-radio-button label="chinese">仅中文</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <div class="word-list">
      <div
        v-for="(word, index) in words"
        :key="word.name"
        class="word-item">
        <div class="word-content">
          <span class="word-index">{{ index + 1 }}.</span>
          <span
            v-if="displayMode !== 'chinese'"
            class="word-name"
            >{{ word.name }}</span
          >
          <span
            v-if="displayMode !== 'english'"
            class="word-description"
            >{{ word.description }}</span
          >
        </div>
        <el-button
          class="speak-btn"
          :class="{ speaking: currentSpeakingIndex === index }"
          @click="speakWord(word.name, index)"
          circle>
          <el-icon><Microphone /></el-icon>
        </el-button>
      </div>
    </div>

    <div class="control-panel">
      <el-button
        type="primary"
        @click="autoPlayAll">
        {{ isPlaying ? (isPaused ? '继续播放' : '暂停播放') : '自动朗读全部' }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ArrowLeft, Microphone } from '@element-plus/icons-vue';
import { getTTSAudio } from '../utils/tts';

const props = defineProps<{
  words: Array<{ name: string; description: string }>;
}>();

const emit = defineEmits<{
  back: [];
}>();

const displayMode = ref('both');

const currentSpeakingIndex = ref(-1);
const isPlaying = ref(false);
const isPaused = ref(false);
let currentAudioElement: HTMLAudioElement | null = null;

const stopCurrentAudio = () => {
  if (currentAudioElement) {
    currentAudioElement.pause();
    currentAudioElement.currentTime = 0;
    currentAudioElement.onended = null;
    currentAudioElement = null;
  }
  currentSpeakingIndex.value = -1;
  isPlaying.value = false;
  isPaused.value = false;
};

const handleBack = () => {
  stopCurrentAudio();
  emit('back');
};

const speakWord = async (word: string, index: number) => {
  if (currentSpeakingIndex.value !== -1) return;

  try {
    currentSpeakingIndex.value = index;
    const audioElement = await getTTSAudio(word);
    currentAudioElement = audioElement;

    audioElement.onended = () => {
      currentSpeakingIndex.value = -1;
      currentAudioElement = null;
      audioElement.onended = null;
    };

    await audioElement.play();
  } catch (error) {
    console.error('播放错误:', error);
    currentSpeakingIndex.value = -1;
    currentAudioElement = null;
  }
};

const autoPlayAll = async () => {
  if (isPaused.value) {
    // 如果是暂停状态，继续播放
    isPaused.value = false;
    if (currentAudioElement) {
      isPlaying.value = true;
      await currentAudioElement.play();
    }
    return;
  } else if (isPlaying.value) {
    // 如果正在播放，则暂停
    isPaused.value = true;
    isPlaying.value = false;
    if (currentAudioElement) {
      currentAudioElement.pause();
    }
    return;
  }

  isPlaying.value = true;
  console.log(props.words);
  try {
    for (const [index, word] of props.words.entries()) {
      if (!isPlaying.value) break;

      // 等待当前单词朗读完成后再继续
      await new Promise(async (resolve) => {
        const audioElement = await getTTSAudio(word.name);
        currentAudioElement = audioElement;
        currentSpeakingIndex.value = index;

        audioElement.onended = () => {
          currentSpeakingIndex.value = -1;
          currentAudioElement = null;
          audioElement.onended = null;
          resolve(void 0);
        };

        try {
          await audioElement.play();
          while (isPaused.value) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        } catch (error) {
          console.error('播放错误:', error);
          currentSpeakingIndex.value = -1;
          currentAudioElement = null;
          resolve(void 0);
        }
      });

      if (!isPlaying.value) break;

      // 添加短暂延迟，让用户有时间消化当前单词
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } catch (error) {
    console.error('自动朗读错误:', error);
  } finally {
    stopCurrentAudio();
  }
};
</script>

<style scoped>
.word-list-container {
  padding: 16px;
  height: 100dvh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
}

.header {
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 4px;
}

.display-mode-controls {
  display: flex;
  align-items: center;
}

.word-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.word-item {
  background: white;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.word-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.word-index {
  color: #909399;
  font-size: 14px;
  min-width: 24px;
}

.word-name {
  font-size: 16px;
  color: #303133;
  font-weight: 500;
}

.word-description {
  color: #606266;
  font-size: 14px;
}

.speak-btn {
  flex-shrink: 0;
}

.speak-btn.speaking {
  color: #409eff;
  transform: scale(1.1);
}

.control-panel {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}
</style>
