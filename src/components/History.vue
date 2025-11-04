<template>
  <el-card class="history-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <div class="header-content">
          <el-icon :size="24" color="#409EFF"><ChatDotRound /></el-icon>
          <h2>AI 问答记录</h2>
          <el-tag v-if="allHistory.length > 0" size="small" type="info">
            共 {{ allHistory.length }} 条
          </el-tag>
        </div>
        <el-button @click="clearHistory" type="danger" size="small" :disabled="allHistory.length === 0">
          <el-icon><Delete /></el-icon>
          清空记录
        </el-button>
      </div>
    </template>

    <div v-if="allHistory.length === 0" class="empty-state">
      <el-empty description="暂无问答记录">
        <template #image>
          <el-icon :size="80" color="#c0c4cc"><ChatLineSquare /></el-icon>
        </template>
      </el-empty>
    </div>

    <div v-else class="timeline-container" @scroll="handleScroll" ref="scrollContainer">
      <el-timeline class="history-timeline">
        <el-timeline-item
          v-for="(item, index) in displayedHistory"
          :key="index"
          :timestamp="item.time"
          placement="top"
        >
          <el-card class="history-item" shadow="hover">
            <div class="question-section">
              <div class="section-header">
                <el-icon color="#409EFF"><QuestionFilled /></el-icon>
                <span class="section-title">问题</span>
              </div>
              <div class="content">{{ item.question }}</div>
            </div>
            
            <el-divider style="margin: 12px 0" />
            
            <div class="answer-section">
              <div class="section-header">
                <el-icon color="#67C23A"><CircleCheck /></el-icon>
                <span class="section-title">回答</span>
              </div>
              <div class="content answer-content">{{ item.answer }}</div>
            </div>

            <div class="item-footer">
              <el-tag size="small" type="info">{{ item.model }}</el-tag>
              <el-button 
                type="primary" 
                size="small" 
                text
                @click="copyToClipboard(item.answer)"
              >
                <el-icon><CopyDocument /></el-icon>
                复制回答
              </el-button>
            </div>
          </el-card>
        </el-timeline-item>
      </el-timeline>

      <!-- 加载更多提示 -->
      <div v-if="hasMore" class="load-more">
        <el-text type="info" size="small">向下滚动加载更多...</el-text>
      </div>
      <div v-else-if="displayedHistory.length > 0" class="load-more">
        <el-text type="info" size="small">已加载全部记录</el-text>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ChatDotRound,
  Delete,
  ChatLineSquare,
  QuestionFilled,
  CircleCheck,
  CopyDocument
} from '@element-plus/icons-vue'

import { useAI } from '../composables/useAI.js'

const { getQAHistory, clearQAHistory } = useAI()

const allHistory = ref([])
const displayedHistory = ref([])
const currentPage = ref(1)
const pageSize = 5
const scrollContainer = ref(null)

// 是否还有更多记录
const hasMore = computed(() => displayedHistory.value.length < allHistory.value.length)

// 加载历史记录
const loadHistory = () => {
  allHistory.value = getQAHistory()
  loadMoreRecords()
}

// 加载更多记录
const loadMoreRecords = () => {
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  const newRecords = allHistory.value.slice(start, end)
  
  if (newRecords.length > 0) {
    displayedHistory.value = [...displayedHistory.value, ...newRecords]
    currentPage.value++
  }
}

// 处理滚动事件
const handleScroll = (e) => {
  const container = e.target
  const { scrollTop, scrollHeight, clientHeight } = container
  
  console.log('滚动事件触发', { scrollTop, scrollHeight, clientHeight, distance: scrollHeight - scrollTop - clientHeight })
  
  // 距离底部小于 100px 时加载更多
  if (scrollHeight - scrollTop - clientHeight < 100 && hasMore.value) {
    console.log('触发加载更多')
    loadMoreRecords()
  }
}

// 清空历史记录
const clearHistory = async () => {
  try {
    await ElMessageBox.confirm('确定要清空所有问答记录吗?', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    
    if (clearQAHistory()) {
      allHistory.value = []
      displayedHistory.value = []
      currentPage.value = 1
      ElMessage.success('已清空历史记录')
    } else {
      ElMessage.error('清空失败')
    }
  } catch {
    // 用户取消
  }
}

// 复制到剪贴板
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制到剪贴板')
  } catch (e) {
    ElMessage.error('复制失败')
  }
}

onMounted(loadHistory)
</script>

<style scoped>
.history-card {
  border-radius: 12px;
  overflow: hidden;
  height: calc(100vh - 70px); /* 占满整个窗口，只留小边距 */
  display: flex;
  flex-direction: column;
}

.history-card :deep(.el-card__body) {
  padding: 0;
  flex: 1;
  min-height: 0; /* 允许内容缩小 */
  overflow: hidden;
}

.history-card :deep(.el-card__header) {
  padding: 12px 16px;
  flex-shrink: 0; /* 防止头部被压缩 */
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-content h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.empty-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

/* 滚动容器 */
.timeline-container {
  height: 100%; /* 占满剩余空间 */
  overflow-y: auto;
  padding: 16px;
}

/* 自定义滚动条样式 */
.timeline-container::-webkit-scrollbar {
  width: 8px;
}

.timeline-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.timeline-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.timeline-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.history-timeline {
  padding-top: 8px;
}

.history-timeline :deep(.el-timeline-item__wrapper) {
  padding-left: 24px;
}

.history-timeline :deep(.el-timeline-item__timestamp) {
  font-size: 12px;
  color: #909399;
}

.history-item {
  margin-bottom: 8px;
}

.history-item :deep(.el-card__body) {
  padding: 12px;
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
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.content {
  font-size: 13px;
  line-height: 1.6;
  color: #606266;
  background: #f5f7fa;
  padding: 8px 12px;
  border-radius: 6px;
  white-space: pre-wrap;
  word-break: break-word;
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
  background: #e4e7ed;
  border-radius: 3px;
}

.answer-content::-webkit-scrollbar-thumb {
  background: #c0c4cc;
  border-radius: 3px;
}

.answer-content::-webkit-scrollbar-thumb:hover {
  background: #a8abb2;
}

.item-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid #e4e7ed;
}

/* 加载更多提示 */
.load-more {
  text-align: center;
  padding: 16px 0;
}
</style>
