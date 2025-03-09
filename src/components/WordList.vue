<template>
  <div class="word-list-container">
    <div class="header">
      <el-button
        @click="handleBack"
        size="small"
        class="back-btn">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>

      <div class="header-controls">
        <el-button
          type="primary"
          size="small"
          @click="autoPlayAll"
          class="auto-play-btn">
          {{ isPlaying ? (isPaused ? '继续播放' : '暂停播放') : '自动朗读' }}
        </el-button>

        <div class="display-mode-controls">
          <el-radio-group
            v-model="displayMode"
            size="small">
            <el-radio-button value="both">英+中</el-radio-button>
            <el-radio-button value="english">仅英文</el-radio-button>
            <el-radio-button value="chinese">仅中文</el-radio-button>
          </el-radio-group>
        </div>
      </div>
    </div>

    <div class="word-list">
      <!-- 基础单词列表 -->
      <template v-if="regularWords.length > 0">
        <div class="list-section-header">基础单词</div>
        <div
          v-for="(word, index) in regularWords"
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
            :class="{
              speaking:
                currentSpeakingIndex === index &&
                currentSpeakingSection === 'regular',
            }"
            @click="speakWord(word.name, index, 'regular')"
            circle>
            <el-icon><Microphone /></el-icon>
          </el-button>
        </div>
      </template>

      <!-- 进阶单词列表 -->
      <template v-if="starWords.length > 0">
        <div class="list-section-divider"></div>
        <div class="list-section-header">进阶单词</div>
        <div
          v-for="(word, index) in starWords"
          :key="word.name"
          class="word-item star-word-item">
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
            :class="{
              speaking:
                currentSpeakingIndex === index &&
                currentSpeakingSection === 'star',
            }"
            @click="speakWord(word.name, index, 'star')"
            circle>
            <el-icon><Microphone /></el-icon>
          </el-button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ArrowLeft, Microphone } from '@element-plus/icons-vue';
import { getTTSAudio } from '../utils/tts';

const props = defineProps<{
  words: Array<{ name: string; description: string; type?: string }>;
}>();

const emit = defineEmits<{
  back: [];
}>();

const displayMode = ref('both');

// 区分普通单词和进阶单词
const regularWords = computed(() => {
  return props.words.filter((word) => !word.type || word.type !== 'star');
});

const starWords = computed(() => {
  return props.words.filter((word) => word.type === 'star');
});

const currentSpeakingIndex = ref(-1);
const currentSpeakingSection = ref(''); // 'regular' 或 'star'
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
  currentSpeakingSection.value = '';
  isPlaying.value = false;
  isPaused.value = false;
};

const handleBack = () => {
  stopCurrentAudio();
  emit('back');
};

const speakWord = async (word: string, index: number, section: string) => {
  if (currentSpeakingIndex.value !== -1) return;

  try {
    currentSpeakingIndex.value = index;
    currentSpeakingSection.value = section;
    const audioElement = await getTTSAudio(word);
    currentAudioElement = audioElement;

    audioElement.onended = () => {
      currentSpeakingIndex.value = -1;
      currentSpeakingSection.value = '';
      currentAudioElement = null;
      audioElement.onended = null;
    };

    await audioElement.play();
  } catch (error) {
    console.error('播放错误:', error);
    currentSpeakingIndex.value = -1;
    currentSpeakingSection.value = '';
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
  try {
    // 先朗读基础单词
    for (const [index, word] of regularWords.value.entries()) {
      if (!isPlaying.value) break;

      // 等待当前单词朗读完成后再继续
      await new Promise(async (resolve) => {
        const audioElement = await getTTSAudio(word.name);
        currentAudioElement = audioElement;
        currentSpeakingIndex.value = index;
        currentSpeakingSection.value = 'regular';

        audioElement.onended = () => {
          currentSpeakingIndex.value = -1;
          currentSpeakingSection.value = '';
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
          currentSpeakingSection.value = '';
          currentAudioElement = null;
          resolve(void 0);
        }
      });

      if (!isPlaying.value) break;

      // 添加短暂延迟，让用户有时间消化当前单词
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // 如果还在播放状态，继续朗读进阶单词
    if (isPlaying.value && starWords.value.length > 0) {
      // 在基础单词和进阶单词之间添加稍长的停顿
      await new Promise((resolve) => setTimeout(resolve, 1500));

      for (const [index, word] of starWords.value.entries()) {
        if (!isPlaying.value) break;

        // 等待当前单词朗读完成后再继续
        await new Promise(async (resolve) => {
          const audioElement = await getTTSAudio(word.name);
          currentAudioElement = audioElement;
          currentSpeakingIndex.value = index;
          currentSpeakingSection.value = 'star';

          audioElement.onended = () => {
            currentSpeakingIndex.value = -1;
            currentSpeakingSection.value = '';
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
            currentSpeakingSection.value = '';
            currentAudioElement = null;
            resolve(void 0);
          }
        });

        if (!isPlaying.value) break;

        // 添加短暂延迟，让用户有时间消化当前单词
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
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

.header-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.auto-play-btn {
  white-space: nowrap;
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
  margin-bottom: 16px;
}

.list-section-header {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 8px 0;
  padding: 8px 12px;
  background-color: #ecf5ff;
  border-radius: 6px;
  border-left: 4px solid #409eff;
}

.list-section-divider {
  height: 1px;
  background-color: #dcdfe6;
  margin: 16px 0;
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

.star-word-item {
  background: #fdf6ec;
  border-left: 4px solid #e6a23c;
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

/* 移动端适配 */
@media (max-width: 768px) {
  .header-controls {
    gap: 8px;
  }
}
</style>
