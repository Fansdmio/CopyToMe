<template>
  <section class="history-page">
    <header class="history-header">
      <div>
        <div class="header-content">
          <el-icon :size="22">
            <ChatDotRound />
          </el-icon>
          <h2>AI 问答记录</h2>
          <el-tag v-if="allHistory.length > 0" size="small" type="info">
            共 {{ allHistory.length }} 条
          </el-tag>
        </div>
        <p>保留最近的 AI 问答，方便回看、复制和清理。</p>
      </div>
    </header>

    <div v-if="allHistory.length === 0" class="empty-state">
      <el-empty description="暂无问答记录">
        <template #image>
          <el-icon :size="80" class="empty-icon">
            <ChatLineSquare />
          </el-icon>
        </template>
      </el-empty>
    </div>

    <div v-else class="timeline-container">
      <div class="history-list">
          <article v-for="(item, index) in displayedHistory" :key="`${item.time}-${index}`" class="history-item">
            <!-- 删除按钮（右上角） -->
            <div class="delete-button-wrapper">
              <el-button type="info" size="small" text @click="deleteHistoryItem(index)" circle>
                <el-icon>
                  <Delete />
                </el-icon>
              </el-button>
            </div>
            
            <div class="question-section">
              <div class="section-header">
                <el-icon>
                  <QuestionFilled />
                </el-icon>
                <span class="section-title">问题</span>
                <span class="history-time">{{ item.time }}</span>
              </div>
              <div class="content">{{ item.question }}</div>
            </div>

            <el-divider style="margin: 12px 0" />

            <div class="answer-section">
              <div class="section-header">
                <el-icon class="success-icon">
                  <CircleCheck />
                </el-icon>
                <span class="section-title">回答</span>
              </div>
              <div class="content answer-content">{{ item.answer }}</div>
            </div>

            <div class="item-footer">
              <el-tag size="small" type="info">{{ item.model }}</el-tag>
              <el-button type="primary" size="small" text @click="copyToClipboard(item.answer)">
                <el-icon>
                  <CopyDocument />
                </el-icon>
                复制回答
              </el-button>
            </div>
          </article>
      </div>

      <!-- 加载更多提示 -->
      <div v-if="hasMore" class="load-more" ref="loadMoreRef" @click="loadMoreRecords">
        <el-text type="info" size="small">向下滚动加载更多...</el-text>
      </div>
      <div v-else-if="displayedHistory.length > 0" class="load-more">
        <el-text type="info" size="small">已加载全部记录</el-text>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ChatDotRound,
  Delete,
  ChatLineSquare,
  QuestionFilled,
  CircleCheck,
  CopyDocument
} from '@element-plus/icons-vue'

import aiMg from "../composables/aiMg.js";
import mitt from '../utils/mitt.js';
import { info, error } from '@tauri-apps/plugin-log';

const allHistory = ref([])
const displayedHistory = ref([])
const currentPage = ref(1)
const pageSize = 5
const loadMoreRef = ref(null)
let loadObserver = null

// 是否还有更多记录
const hasMore = computed(() => displayedHistory.value.length < allHistory.value.length)

// 加载历史记录
const loadHistory = async () => {
  try {
    info("History: 加载历史记录");
    currentPage.value = 1
    displayedHistory.value = []
    allHistory.value = await aiMg.getQAHistory()
    info(`History: 加载了 ${allHistory.value.length} 条历史记录`);
    loadMoreRecords()
    await nextTick()
    setupLoadObserver()
  } catch (e) {
    error(`History: 加载历史记录失败: ${e}`);
    allHistory.value = []
    displayedHistory.value = []
  }
}

// 加载更多记录
const loadMoreRecords = () => {
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  const newRecords = allHistory.value.slice(start, end)

  if (newRecords.length > 0) {
    displayedHistory.value = [...displayedHistory.value, ...newRecords]
    info(`History: 加载了第 ${currentPage.value} 页,共 ${newRecords.length} 条记录`);
    currentPage.value++
  }
}

const setupLoadObserver = () => {
  loadObserver?.disconnect()
  if (!loadMoreRef.value) return

  // 历史页不再创建内部滚动条，使用底部哨兵跟随外层页面滚动加载更多。
  loadObserver = new IntersectionObserver((entries) => {
    if (entries.some(entry => entry.isIntersecting) && hasMore.value) {
      loadMoreRecords()
    }
  }, {
    root: null,
    rootMargin: '160px 0px',
    threshold: 0
  })
  loadObserver.observe(loadMoreRef.value)
}

// 复制到剪贴板
const copyToClipboard = async (text) => {
  info("History: 复制到剪贴板");
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制到剪贴板')
  } catch (e) {
    error(`History: 复制失败: ${e}`);
    ElMessage.error('复制失败')
  }
}

// 删除单条历史记录
const deleteHistoryItem = async (index) => {
  info(`History: 尝试删除历史记录, 索引: ${index}`);
  try {
    await ElMessageBox.confirm('确定要删除这条问答记录吗?', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    // 找到在全部历史中的真实索引
    const item = displayedHistory.value[index]
    const realIndex = allHistory.value.findIndex(h => 
      h.question === item.question && 
      h.answer === item.answer && 
      h.time === item.time
    )

    if (realIndex !== -1 && await aiMg.deleteQAHistoryByIndex(realIndex)) {
      info("History: 历史记录已删除");
      ElMessage.success('已删除记录')
      // 重新加载历史记录
      await loadHistory()
    } else {
      error("History: 删除失败");
      ElMessage.error('删除失败')
    }
  } catch {
    // 用户取消
    info("History: 用户取消删除操作");
  }
}



mitt.on('history-update', loadHistory)

onMounted(() => {
  try {
    info("History: 组件挂载");
    loadHistory()
  } catch (e) {
    error(`History: 组件挂载失败: ${e}`);
  }
})

onUnmounted(() => {
  loadObserver?.disconnect()
})
</script>

<style scoped>
.history-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border: 1px solid var(--ctm-border);
  border-radius: var(--ctm-radius-lg);
  background: var(--ctm-surface);
  box-shadow: var(--ctm-shadow-subtle);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-content h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: var(--ctm-text);
}

.history-header p {
  margin: 7px 0 0;
  color: var(--ctm-text-muted);
  font-size: 13px;
}

.empty-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  border: 1px solid var(--ctm-border);
  border-radius: var(--ctm-radius-lg);
  background: var(--ctm-surface);
}

/* 滚动容器 */
.timeline-container {
  overflow: visible;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  position: relative;
  padding: 16px;
  border: 1px solid var(--ctm-border);
  border-radius: var(--ctm-radius-lg);
  background: var(--ctm-surface);
  box-shadow: var(--ctm-shadow-subtle);
}

.delete-button-wrapper {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
}

.delete-button-wrapper .el-button {
  color: var(--ctm-text-muted);
  transition: color var(--ctm-transition), background-color var(--ctm-transition);
}

.delete-button-wrapper .el-button:hover {
  color: var(--ctm-danger);
  background-color: var(--ctm-danger-soft);
}

.question-section,
.answer-section {
  margin-bottom: 0;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  color: var(--ctm-control);
}

.section-title {
  font-size: 14px;
  font-weight: 800;
  color: var(--ctm-text);
}

.history-time {
  margin-left: auto;
  padding-right: 34px;
  color: var(--ctm-text-muted);
  font-size: 12px;
}

.success-icon {
  color: var(--ctm-success);
}

.content {
  font-size: 13px;
  line-height: 1.6;
  color: var(--ctm-text-soft);
  background: var(--ctm-surface-muted);
  padding: 10px 12px;
  border: 1px solid var(--ctm-border);
  border-radius: var(--ctm-radius-sm);
  white-space: pre-wrap;
  word-break: break-word;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  user-select: text;
  cursor: text;
}

/* 回答内容添加最大高度和滚动条 */
.answer-content {
  max-height: 300px;
  overflow-y: auto;
}

.answer-content::-webkit-scrollbar {
  width: 6px;
}

.answer-content::-webkit-scrollbar-track {
  background: var(--ctm-surface-muted);
  border-radius: 3px;
}

.answer-content::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.18);
  border-radius: 3px;
}

.answer-content::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.28);
}

.empty-icon {
  color: var(--ctm-text-muted);
}

.item-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid var(--ctm-border);
}

/* 加载更多提示 */
.load-more {
  text-align: center;
  padding: 16px 0;
  cursor: pointer;
}
</style>
