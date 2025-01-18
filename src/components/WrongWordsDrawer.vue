<template>
  <el-drawer
    v-model="visible"
    title="错误单词列表"
    direction="rtl"
    size="80%">
    <div class="wrong-words-drawer">
      <div v-if="wrongWordsList.length > 0">
        <div class="drawer-header">
          <span>共 {{ wrongWordsList.length }} 个错误单词</span>
          <el-button
            type="danger"
            size="small"
            @click="handleClear">
            清空错误单词
          </el-button>
        </div>
        <el-table
          :data="wrongWordsList"
          style="width: 100%"
          border>
          <el-table-column
            prop="name"
            label="英文"
            min-width="120" />
          <el-table-column
            prop="description"
            label="中文"
            min-width="120" />
          <el-table-column
            prop="correctCount"
            label="已答对次数"
            min-width="150">
            <template #default="{ row }">
              <el-progress
                :percentage="(row.correctCount || 0) * 20"
                :format="() => `${row.correctCount || 0}/5`"
                :status="(row.correctCount || 0) === 5 ? 'success' : ''" />
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div
        v-else
        class="empty-message">
        暂无错误单词
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ElMessageBox, ElMessage } from 'element-plus';
import { wrongWordsManager } from '../utils/wrongWords';

const props = defineProps<{
  modelValue: boolean;
  currentFolder: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'clear'): void;
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const refreshTrigger = ref(0);

const wrongWordsList = computed(() => {
  refreshTrigger.value;
  if (!props.currentFolder) return [];
  return wrongWordsManager.getWrongWords(props.currentFolder);
});

const handleClear = () => {
  ElMessageBox.confirm('确定要清空所有错误单词吗？此操作不可恢复。', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      wrongWordsManager.clearWrongWords(props.currentFolder);
      emit('clear');
      ElMessage.success('错误单词本已清空');
    })
    .catch(() => {
      // 取消时不做任何操作
    });
};

const refresh = () => {
  refreshTrigger.value++;
};

watch(
  () => props.currentFolder,
  () => {
    refresh();
  }
);

defineExpose({
  refresh,
});
</script>

<style scoped>
.wrong-words-drawer {
  padding: 0 20px;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 10px 0;
}

.drawer-header span {
  font-size: 16px;
  color: #606266;
}

.empty-message {
  text-align: center;
  color: #909399;
  padding: 40px 0;
  font-size: 14px;
}

:deep(.el-table) {
  margin-bottom: 20px;
}

:deep(.el-progress) {
  width: 90%;
  margin: 0 auto;
}
</style>
