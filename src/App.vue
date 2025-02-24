<template>
  <div class="app-container">
    <!-- 添加加载状态显示 -->
    <div
      v-if="isLoading"
      class="loading-overlay">
      <el-icon class="loading-icon"><Loading /></el-icon>
      <span>加载中...</span>
    </div>
    <audio
      id="tts-audio"
      playsinline
      webkit-playsinline
      preload="auto"
      style="
        position: fixed;
        top: -100px;
        left: -100px;
        width: 1px;
        height: 1px;
        opacity: 0;
        pointer-events: none;
      "></audio>
    <!-- 使用抽屉组件 -->
    <WrongWordsDrawer
      ref="wrongWordsDrawerRef"
      v-model="drawerVisible"
      :current-folder="currentFolder"
      @clear="updateWrongWordsList" />

    <div
      v-if="!isReciting && !isReading"
      class="content-wrapper">
      <div class="header-actions">
        <h1>英语单词学习</h1>
        <el-button
          type="primary"
          @click="openWrongWordsDrawer"
          class="view-wrong-words-btn">
          查看错误单词
        </el-button>
      </div>

      <!-- 文件夹选择列表 -->
      <div class="folder-list">
        <button
          v-for="folder in folders"
          :key="folder"
          :class="{ active: currentFolder === folder }"
          @click="selectFolder(folder)">
          {{ folder }}的单词本
        </button>
      </div>

      <!-- 显示选中文件夹的单词集 -->
      <div
        v-if="currentUnits.length"
        class="units-container">
        <div
          v-for="unit in currentUnits"
          :key="unit.name"
          class="unit-card"
          :class="{ active: selectedUnits.includes(unit) }"
          :data-type="unit.type"
          @click="toggleUnit(unit)">
          <div class="card-header">
            <h3>{{ unit.name }}</h3>
            <div class="card-actions">
              <el-icon
                v-if="isUnitCompleted(unit)"
                class="completed-icon"
                :style="{ color: '#67C23A' }">
                <CircleCheck />
              </el-icon>
              <div
                v-if="unit.type === 'wrong-words'"
                class="clear-icon"
                @click.stop="clearWrongWords">
                <el-icon><Delete /></el-icon>
              </div>
            </div>
          </div>
          <p>{{ unit.description }}</p>
          <div class="word-count">单词数量: {{ unit.words?.length || 0 }}</div>
        </div>
        <!-- <div
          class="unit-card"
          v-for="unit in currentUnits"
          :key="unit.name">
          <div class="card-header">测试</div>
          <p>测试</p>
          <div class="word-count">单词数量: 100</div>
        </div> -->
      </div>

      <!-- 在模板中显示统计信息 -->
      <div
        v-if="!isReciting"
        class="stats-card">
        <h3>学习统计</h3>
        <div class="stats-content">
          <div class="stat-item">
            <div class="stat-value">{{ learningStats.totalWords }}</div>
            <div class="stat-label">总单词数</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ learningStats.learnedWords }}</div>
            <div class="stat-label">已学习</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ learningStats.masteredWords }}</div>
            <div class="stat-label">已掌握</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 背诵模式 -->
    <ReciteWords
      v-else-if="isReciting"
      :words="allWords"
      :units="selectedUnits"
      @restart="handleRestart"
      @updateWrongWords="updateWrongWordsList"
      @updateUnitCompletion="updateUnitCompletion" />

    <!-- 朗读模式 -->
    <WordList
      v-else-if="isReading && !isSentenceType"
      :words="allWords"
      @back="isReading = false" />

    <!-- 句子朗读模式 -->
    <SentenceList
      v-else-if="isReading && isSentenceType"
      :sentences="allWords"
      @back="isReading = false" />

    <!-- 显示选中的单元数量和操作按钮 -->
    <div
      v-if="selectedUnits.length && !isReciting && !isReading"
      class="selected-info">
      <span
        >已选择 {{ selectedUnits.length }} 个单元， 共
        {{ totalWords }} 个单词</span
      >
      <div class="action-buttons">
        <el-button-group>
          <el-button
            type="primary"
            size="small"
            @click="startReading"
            class="action-button">
            开始朗读
          </el-button>
          <el-button
            v-if="!isSentenceType"
            type="primary"
            size="small"
            @click="startReciting"
            class="action-button">
            开始背诵
          </el-button>
        </el-button-group>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue';
import ReciteWords from './components/ReciteWords.vue';
import WrongWordsDrawer from './components/WrongWordsDrawer.vue';
import WordList from './components/WordList.vue';
import SentenceList from './components/SentenceList.vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Delete, CircleCheck, Loading } from '@element-plus/icons-vue';
import { wrongWordsManager } from './utils/wrongWords';
import { getFolders, getFolderUnits } from './data';
import type { Unit } from './data';

// 改为本地状态管理
const wordUnits = ref<Unit[]>([]);
const isLoading = ref(true);

// 获取所有文件夹
const folders = computed(() => getFolders());

// 当前选中的文件夹
const currentFolder = ref('');

// 已选择的单元
const selectedUnits = ref<any[]>([]);

// 自动选择第一个文件夹
watchEffect(() => {
  if (folders.value.length > 0 && !currentFolder.value) {
    currentFolder.value = folders.value[0];
  }
});

// 初始化应用
const initializeApp = async () => {
  isLoading.value = true;
  try {
    // 获取所有文件夹的数据
    const allFolders = getFolders();

    // 获取上次选中的文件夹
    const lastSelectedFolder = localStorage.getItem('lastSelectedFolder');

    // 如果有上次选中的文件夹且该文件夹仍然存在，则选中它
    if (lastSelectedFolder && allFolders.includes(lastSelectedFolder)) {
      currentFolder.value = lastSelectedFolder;
    } else if (allFolders.length > 0) {
      // 否则选中第一个文件夹
      currentFolder.value = allFolders[0];
    }

    // 初始化单元数据
    wordUnits.value = [];
    allFolders.forEach((folder) => {
      const units = getFolderUnits(folder).map((unit: Unit) => ({
        ...unit,
        owner: folder,
      }));
      wordUnits.value.push(...units);
    });
  } catch (error) {
    console.error('Error initializing app:', error);
    ElMessage.error('加载数据失败，请刷新页面重试');
  } finally {
    isLoading.value = false;
  }
};

// 确保调用初始化函数
initializeApp();

// 选择文件夹
const selectFolder = (folder: string) => {
  if (currentFolder.value === folder) return;
  currentFolder.value = folder;
  // 保存选中的文件夹到 localStorage
  localStorage.setItem('lastSelectedFolder', folder);
  selectedUnits.value = []; // 切换文件夹时清空选择
};

// 添加一个 ref 来触发视图更新
const refreshTrigger = ref(0);

// 修改清空错误单词的方法
const clearWrongWords = () => {
  ElMessageBox.confirm('确定要清空所有错误单词吗？此操作不可恢复。', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      wrongWordsManager.clearWrongWords(currentFolder.value);
      // 如果当前选中的是错误单词本，清空选择
      if (
        selectedUnits.value.length > 0 &&
        selectedUnits.value[0].type === 'wrong-words'
      ) {
        selectedUnits.value = [];
      }
      // 增加计数器值来触发视图更新
      refreshTrigger.value++;
      // 关闭抽屉（如果打开的话）
      drawerVisible.value = false;
      ElMessage.success('错误单词本已清空');
    })
    .catch(() => {
      // 取消时不做任何操作
    });
};

// 修改 currentUnits 计算属性，添加 refreshTrigger 依赖
const currentUnits = computed(() => {
  // 添加 refreshTrigger 作为依赖，这样它变化时会重新计算
  refreshTrigger.value;

  if (!currentFolder.value) return [];

  // 先获取普通单词集
  const units = wordUnits.value.filter(
    (unit) => unit.owner === currentFolder.value && unit.type !== 'wrong-words'
  );

  // 添加错误单词集
  const wrongWords = wrongWordsManager.getWrongWords(currentFolder.value);
  if (wrongWords.length > 0) {
    units.push({
      name: '错误单词本',
      description: '收集做错的单词，答对3次后移除',
      type: 'wrong-words',
      words: wrongWords.map((word) => ({
        ...word,
        type: 'wrong-words', // 添加类型标记
      })),
      owner: currentFolder.value,
    });
  }

  return units;
});

// 切换单元选择状态
const toggleUnit = (unit: any) => {
  // 如果是错误单词本
  if (unit.type === 'wrong-words') {
    // 如果已经选中了其他单元，不允许选择错误单词本
    if (
      selectedUnits.value.length > 0 &&
      selectedUnits.value[0].type !== 'wrong-words'
    ) {
      ElMessage.warning('错误单词本只能单独练习');
      return;
    }
    // 切换错误单词本的选中状态
    const index = selectedUnits.value.indexOf(unit);
    if (index === -1) {
      selectedUnits.value = [unit]; // 只允许选中错误单词本一个
    } else {
      selectedUnits.value = [];
    }
  } else {
    // 如果已经选中了错误单词本，不允许选择其他单元
    if (
      selectedUnits.value.length > 0 &&
      selectedUnits.value[0].type === 'wrong-words'
    ) {
      ElMessage.warning('请先取消选择错误单词本');
      return;
    }

    // 检查是否在尝试混合选择句子和单词单元
    const isSentenceUnit = unit.type === 'sentence';
    const hasSelectedUnits = selectedUnits.value.length > 0;
    const hasSelectedSentence =
      hasSelectedUnits && selectedUnits.value[0].type === 'sentence';
    const hasSelectedWord =
      hasSelectedUnits && selectedUnits.value[0].type !== 'sentence';

    if (
      hasSelectedUnits &&
      ((isSentenceUnit && hasSelectedWord) ||
        (!isSentenceUnit && hasSelectedSentence))
    ) {
      ElMessage.warning('句子练习和单词练习不能同时选择');
      return;
    }

    // 切换普通单元的选中状态
    const index = selectedUnits.value.indexOf(unit);
    if (index === -1) {
      selectedUnits.value.push(unit);
    } else {
      selectedUnits.value.splice(index, 1);
    }
  }
};

// 计算选中单元的总单词数
const totalWords = computed(() => {
  return selectedUnits.value.reduce((sum, unit) => sum + unit.words.length, 0);
});

// 背诵模式状态
const isReciting = ref(false);

// 朗读模式状态
const isReading = ref(false);

// 所有选中单元的单词列表
const allWords = computed(() => {
  const words: any[] = [];
  selectedUnits.value.forEach((unit) => {
    // 确保 unit.words 存在且不为空
    if (unit.words && unit.words.length > 0) {
      if (unit.type === 'sentence') {
        // 对于句子类型，根据type分组处理
        const processedWords = unit.words.map((word: any) => {
          if (word.type === 'dialogue') {
            return word.data;
          } else if (word.type === 'single') {
            return [word.data[0]];
          }
          return [];
        });
        words.push(...processedWords);
      } else {
        // 为每个单词添加所有者信息
        const unitsWords = unit.words.map((word: any) => ({
          ...word,
          owner: unit.owner,
        }));
        words.push(...unitsWords);
      }
    }
  });
  // 只在背诵模式下且不是句子类型时随机打乱单词顺序
  if (isReciting.value && !isSentenceType.value) {
    return words.sort(() => Math.random() - 0.5);
  }
  return words;
});

// 计算是否是句子类型
const isSentenceType = computed(() => {
  return (
    selectedUnits.value.length > 0 && selectedUnits.value[0].type === 'sentence'
  );
});

// 开始朗读
const startReading = () => {
  // 检查是否有内容要朗读
  if (allWords.value.length === 0) {
    ElMessage.warning('请先选择要朗读的单元');
    return;
  }

  // 设置朗读模式状态
  isReciting.value = false;
  isReading.value = true;
};

// 开始背诵
const startReciting = () => {
  // 如果是句子类型，不允许背诵
  if (isSentenceType.value) {
    ElMessage.warning('句子单元只支持朗读模式');
    return;
  }

  // 检查是否有单词要背诵
  if (allWords.value.length === 0) {
    ElMessage.warning('请先选择要背诵的单元');
    return;
  }

  isReciting.value = true;
};

// 检查单元是否完成（100%正确率）
const isUnitCompleted = (unit: any) => {
  if (unit.type === 'wrong-words') return false;
  const completionKey = `completion-${unit.owner}-${unit.name}`;
  return localStorage.getItem(completionKey) === 'true';
};

// 更新单元完成状态
const updateUnitCompletion = (unit: any, isCompleted: boolean) => {
  const completionKey = `completion-${unit.owner}-${unit.name}`;
  if (isCompleted) {
    localStorage.setItem(completionKey, 'true');
  } else {
    localStorage.removeItem(completionKey);
  }
  // 触发视图更新
  refreshTrigger.value++;
};

// 更新错误单词列表
const updateWrongWordsList = () => {
  refreshTrigger.value++;
  // 如果抽屉组件存在，调用其刷新方法
  if (wrongWordsDrawerRef.value) {
    wrongWordsDrawerRef.value.refresh();
  }
};

// 添加抽屉相关的状态
const drawerVisible = ref(false);

// 打开抽屉的方法
const openWrongWordsDrawer = () => {
  drawerVisible.value = true;
};

// 添加新的计算属性
const learningStats = computed(() => {
  const progress = JSON.parse(localStorage.getItem('wordProgress') || '{}');
  const stats = {
    totalWords: 0,
    learnedWords: 0,
    masteredWords: 0,
  };

  // 统计当前文件夹的学习情况
  if (currentFolder.value) {
    currentUnits.value.forEach((unit) => {
      if (
        unit.type !== 'wrong-words' &&
        unit.words &&
        Array.isArray(unit.words)
      ) {
        unit.words.forEach((word: any) => {
          const wordKey = `${currentFolder.value}-${word.name}`;
          const wordProgress = progress[wordKey] || 0;
          stats.totalWords++;
          if (wordProgress > 0) stats.learnedWords++;
          if (wordProgress >= 5) stats.masteredWords++;
        });
      }
    });
  }

  return stats;
});

// 处理重启事件
const handleRestart = () => {
  isReciting.value = false;
  // 清除选中状态
  selectedUnits.value = [];
};

const wrongWordsDrawerRef = ref();
</script>

<style scoped>
/* 基础容器样式 */
.app-container {
  width: 100%;
  height: 100dvh;
  background-color: #f5f7fa;
  padding: 16px;
  box-sizing: border-box;
}

/* 内容包装器 */
.content-wrapper {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 标题区域 */
.header-actions {
  text-align: center;
  margin-bottom: 16px;
}

.header-actions h1 {
  font-size: 24px;
  margin: 0 0 16px 0;
  color: #303133;
}

/* 查看错误单词按钮 */
.view-wrong-words-btn {
  width: 100%;
  height: 40px;
}

/* 文件夹列表 */
.folder-list {
  display: flex;
  gap: 10px;
  margin: 0;
  padding: 0;
}

.folder-list button {
  flex: 1;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  background: white;
  color: #606266;
  font-size: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.folder-list button.active {
  background: #409eff;
  color: white;
}

/* 单元卡片列表 */
.units-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 20px;
}

/* 单元卡片 */
.unit-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.unit-card.active {
  border-color: #409eff;
  background-color: #ecf5ff;
}

.unit-card h3 {
  font-size: 18px;
  margin: 0;
  color: #303133;
}

.unit-card p {
  font-size: 14px;
  color: #606266;
  margin: 0 0 8px 0;
}

.word-count {
  font-size: 14px;
  color: #909399;
}

/* 底部选择信息 */
.selected-info {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  padding: 16px;
  display: flex;
  align-items: center; /* 垂直居中 */
  justify-content: space-between; /* 水平分布 */
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

/* 操作按钮区域 */
.action-buttons {
  display: flex;
  gap: 12px;
}

/* 操作按钮 */
.action-button {
  flex-shrink: 0; /* 防止按钮被压缩 */
  padding: 14px 12px;
}

/* 选择信息文字 */
.selected-info span {
  flex: 1; /* 文字占据剩余空间 */
  text-align: left; /* 文字左对齐 */
}

/* 统计卡片 */
.stats-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 80px;
  text-align: center;
}

.stats-content {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-top: 16px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

/* 移动端适配 */
@media (max-width: 430px) {
  .app-container {
    padding: 12px;
  }
}

/* 添加卡片头部样式 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  position: relative;
}

/* 清空图标样式 */
.clear-icon {
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 4px 8px;
}

.clear-icon .el-icon {
  font-size: 18px;
  color: #f56c6c;
}

.clear-icon:hover .el-icon {
  color: #ff4d4f;
  transform: scale(1.1);
}

/* 错误单词本特殊样式 */
.unit-card[data-type='wrong-words'] {
  border-color: #fef0f0;
}

.unit-card[data-type='wrong-words'].active {
  border-color: #f56c6c;
  background-color: #fef0f0;
}

.unit-card[data-type='wrong-words'] h3 {
  color: #f56c6c;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 2000;
}

.loading-icon {
  font-size: 32px;
  color: #409eff;
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
