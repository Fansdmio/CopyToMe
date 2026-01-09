<template>
  <div class="notifications-page">
    <div class="page-header">
      <h2>通知中心</h2>
      <div class="notification-count" v-if="notifications.length > 0">
        {{ notifications.length }} 条通知
      </div>
    </div>

    <div v-if="notifications.length === 0" class="empty-state">
      <div class="empty-icon">🔔</div>
      <div class="empty-text">暂无通知</div>
      <div class="empty-hint">通知消息会显示在这里</div>
    </div>

    <div v-else class="notifications-list">
      <div 
        v-for="notification in notifications" 
        :key="notification.id"
        class="notification-card"
        @click="handleShow(notification)"
      >
        <div class="card-content">
          <h3 class="card-title">{{ notification.title }}</h3>
          <div class="card-time">{{ formatTime(notification.receivedAt) }}</div>
        </div>
        
        <button 
          class="delete-btn"
          @click.stop="handleDelete(notification.id)"
          title="删除通知"
        >
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import { useNotifications } from '../composables/notificationMg'

const { 
  notifications, 
  showNotification, 
  deleteNotification
} = useNotifications()

const formatTime = (timeStr) => {
  if (!timeStr) return '-'
  const date = new Date(timeStr)
  const now = new Date()
  const diff = now - date
  
  // 1小时内
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000))
    return minutes < 1 ? '刚刚' : `${minutes} 分钟前`
  }
  
  // 24小时内
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000))
    return `${hours} 小时前`
  }
  
  // 7天内
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000))
    return `${days} 天前`
  }
  
  // 超过7天显示具体日期
  return date.toLocaleDateString('zh-CN', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const handleShow = (notification) => {
  showNotification(notification)
}

const handleDelete = async (id) => {
  await deleteNotification(id)
  ElMessage.success('已删除')
}
</script>

<style scoped>
.notifications-page {
  padding: 24px;
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f0f0f0;
}

.page-header h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
}

.notification-count {
  background: linear-gradient(135deg, #4A90E2 0%, #357ABD 100%);
  color: white;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 80px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.3;
}

.empty-text {
  font-size: 20px;
  font-weight: 500;
  color: #666;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 14px;
  color: #999;
}

/* 通知列表 */
.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.notification-card {
  position: relative;
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
}

.notification-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(135deg, #4A90E2 0%, #357ABD 100%);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.notification-card:hover {
  border-color: #d0d0d0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.card-content {
  padding-right: 40px;
}

.card-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 500;
  color: #1a1a1a;
  line-height: 1.5;
}

.card-time {
  font-size: 13px;
  color: #888;
  font-weight: 400;
}

/* 删除按钮 */
.delete-btn {
  position: absolute;
  top: 50%;
  right: 16px;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: #999;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  padding: 0;
}

.delete-btn:hover {
  background: #fee;
  color: #f56c6c;
  transform: translateY(-50%) scale(1.1);
}

.delete-btn:active {
  transform: translateY(-50%) scale(0.95);
}

.delete-btn svg {
  display: block;
}
</style>
