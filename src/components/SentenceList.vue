<template>
  <div class="sentence-list-container">
    <div class="header">
      <el-button
        @click="handleBack"
        class="back-btn">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>

      <!-- 添加显示模式切换按钮组 -->
      <div class="display-mode-controls">
        <el-radio-group
          v-model="displayMode"
          size="small">
          <el-radio-button value="both">英文+中文</el-radio-button>
          <el-radio-button value="english">仅英文</el-radio-button>
          <el-radio-button value="chinese">仅中文</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <div class="sentence-list">
      <div
        v-for="(group, groupIndex) in sentences"
        :key="groupIndex"
        class="sentence-group">
        <div class="sentence-group-header">
          <div class="sentence-type">
            {{ isDialogue(group) ? '对话' : '单句' }}
          </div>
          <el-button
            v-if="isDialogue(group) || (!isDialogue(group) && group.length > 1)"
            type="primary"
            size="small"
            :class="{ speaking: isGroupSpeaking(groupIndex) }"
            @click="speakDialogue(group, groupIndex)"
            class="speak-dialogue-btn">
            <el-icon
              v-if="isGroupSpeaking(groupIndex)"
              class="speaking-icon">
              <Microphone />
            </el-icon>
            {{
              isGroupSpeaking(groupIndex)
                ? '正在朗诵...'
                : isDialogue(group)
                ? '朗诵对话'
                : isGroupPlaying(groupIndex)
                ? '停止朗读'
                : '朗读所有'
            }}
          </el-button>
        </div>
        <div
          v-for="(sentence, sentenceIndex) in group"
          :key="sentenceIndex"
          class="sentence-item">
          <div class="sentence-content">
            <div
              v-if="displayMode !== 'chinese'"
              class="sentence-text">
              {{ sentence.sentence }}
            </div>
            <div
              v-if="displayMode !== 'english'"
              class="sentence-description">
              {{ sentence.description }}
            </div>
          </div>
          <el-button
            class="speak-btn"
            :class="{
              speaking:
                (currentSpeakingGroup === groupIndex &&
                  currentSpeakingIndex === sentenceIndex) ||
                (isGroupSpeaking(groupIndex) &&
                  !isDialogue(group) &&
                  currentSpeakingIndex === sentenceIndex),
            }"
            @click="speakSentence(sentence.sentence, groupIndex, sentenceIndex)"
            circle>
            <el-icon><Microphone /></el-icon>
          </el-button>
        </div>
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
  sentences: Array<
    Array<{ sentence: string; description: string; type?: string }>
  >;
}>();

const emit = defineEmits<{
  back: [];
}>();

// 添加显示模式状态
const displayMode = ref('both'); // 'both', 'english', 'chinese'

const currentSpeakingGroup = ref(-1);
const currentSpeakingIndex = ref(-1);
const isPlaying = ref(false);
const isPaused = ref(false);
let currentAudioElement: HTMLAudioElement | null = null;

// 判断是否为对话类型
const isDialogue = (
  group: Array<{ sentence: string; description: string; type?: string }>
) => {
  // 检查第一个元素的type属性，如果是dialogue则为对话，否则为单句
  return group[0]?.type === 'dialogue';
};

// 判断当前组是否正在朗读
const isGroupSpeaking = (groupIndex: number) => {
  return (
    currentSpeakingGroup.value === groupIndex &&
    currentSpeakingIndex.value === -1
  );
};

const isGroupPlaying = (groupIndex: number) => {
  return (
    currentSpeakingGroup.value === groupIndex &&
    currentSpeakingIndex.value !== -1
  );
};

// 朗读整个对话或单句组
const speakDialogue = async (
  group: Array<{ sentence: string; description: string; type?: string }>,
  groupIndex: number
) => {
  // 如果当前组正在朗读，则停止朗读
  if (isGroupPlaying(groupIndex) || isGroupSpeaking(groupIndex)) {
    stopCurrentAudio();
    return;
  }

  if (currentSpeakingGroup.value !== -1) return;

  try {
    currentSpeakingGroup.value = groupIndex;
    currentSpeakingIndex.value = -1;

    for (const [index, sentence] of group.entries()) {
      if (currentSpeakingGroup.value !== groupIndex) break;

      currentSpeakingIndex.value = index;
      const audioElement = await getTTSAudio(sentence.sentence);
      currentAudioElement = audioElement;

      await new Promise<void>((resolve) => {
        audioElement.onended = () => {
          audioElement.onended = null;
          resolve();
        };
        audioElement.play().catch(() => {
          resolve();
        });
      });

      // 在句子之间添加短暂停顿
      if (index < group.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  } catch (error) {
    console.error('播放对话错误:', error);
  } finally {
    currentSpeakingGroup.value = -1;
    currentSpeakingIndex.value = -1;
    currentAudioElement = null;
  }
};

const stopCurrentAudio = () => {
  if (currentAudioElement) {
    currentAudioElement.pause();
    currentAudioElement.currentTime = 0;
    currentAudioElement.onended = null;
    currentAudioElement = null;
  }
  currentSpeakingGroup.value = -1;
  currentSpeakingIndex.value = -1;
  isPlaying.value = false;
  isPaused.value = false;
};

const handleBack = () => {
  stopCurrentAudio();
  emit('back');
};

const speakSentence = async (
  text: string,
  groupIndex: number,
  sentenceIndex: number
) => {
  if (currentSpeakingGroup.value !== -1 || currentSpeakingIndex.value !== -1)
    return;

  try {
    currentSpeakingGroup.value = groupIndex;
    currentSpeakingIndex.value = sentenceIndex;
    const audioElement = await getTTSAudio(text);
    currentAudioElement = audioElement;

    audioElement.onended = () => {
      currentSpeakingGroup.value = -1;
      currentSpeakingIndex.value = -1;
      currentAudioElement = null;
      audioElement.onended = null;
    };

    await audioElement.play();
  } catch (error) {
    console.error('播放错误:', error);
    currentSpeakingGroup.value = -1;
    currentSpeakingIndex.value = -1;
    currentAudioElement = null;
  }
};

const autoPlayAll = async () => {
  if (isPaused.value) {
    isPaused.value = false;
    if (currentAudioElement) {
      isPlaying.value = true;
      await currentAudioElement.play();
    }
    return;
  } else if (isPlaying.value) {
    isPaused.value = true;
    isPlaying.value = false;
    if (currentAudioElement) {
      currentAudioElement.pause();
    }
    return;
  }

  isPlaying.value = true;
  try {
    for (const [groupIndex, group] of props.sentences.entries()) {
      if (!isPlaying.value) break;

      for (const [sentenceIndex, sentence] of group.entries()) {
        if (!isPlaying.value) break;

        const text = sentence.sentence;
        if (!text) continue;

        await new Promise(async (resolve) => {
          const audioElement = await getTTSAudio(text);
          currentAudioElement = audioElement;
          currentSpeakingGroup.value = groupIndex;
          currentSpeakingIndex.value = sentenceIndex;

          audioElement.onended = () => {
            currentSpeakingGroup.value = -1;
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
            currentSpeakingGroup.value = -1;
            currentSpeakingIndex.value = -1;
            currentAudioElement = null;
            resolve(void 0);
          }
        });

        if (!isPlaying.value) break;
        await new Promise((resolve) => setTimeout(resolve, 1000));
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
.sentence-list-container {
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

/* 添加显示模式控制样式 */
.display-mode-controls {
  display: flex;
  align-items: center;
}

.sentence-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.sentence-group {
  background: white;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.sentence-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  background-color: #f8f9fa;
}

.sentence-content {
  flex: 1;
  margin-right: 16px;
}

.sentence-text {
  font-size: 16px;
  color: #303133;
  margin-bottom: 8px;
  font-weight: 500;
}

.sentence-description {
  font-size: 14px;
  color: #606266;
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
  padding: 16px 0;
}

.sentence-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.sentence-type {
  font-size: 14px;
  color: #909399;
  font-weight: 500;
}

.speak-dialogue-btn {
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 80px;
  justify-content: center;
}

.speak-dialogue-btn .speaking-icon {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

@media (max-width: 768px) {
  .sentence-list-container {
    padding: 12px;
  }

  .sentence-group {
    padding: 12px;
    gap: 12px;
  }

  .sentence-item {
    padding: 10px;
  }

  .sentence-text {
    font-size: 15px;
  }

  .sentence-description {
    font-size: 13px;
  }
}
</style>
