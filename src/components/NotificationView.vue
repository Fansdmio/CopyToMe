<template>
  <teleport to="body">
    <div v-if="notification" :key="notificationKey" class="notification-overlay">
      <!-- 动态渲染的通知内容 -->
      <div ref="notificationContainer" class="notification-wrapper">
        <!-- 这里会动态插入服务端的 HTML -->
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, watch, onUnmounted, nextTick, computed } from 'vue'

const props = defineProps({
  notification: {
    type: Object,
    default: null
  }
})

const notificationContainer = ref(null)
const notificationKey = computed(() => props.notification ? `${props.notification.id}-${Date.now()}` : null)
let styleElement = null
let scriptElement = null

// 清理函数
const cleanup = () => {
  console.log('清理通知内容')
  if (styleElement) {
    styleElement.remove()
    styleElement = null
  }
  if (scriptElement) {
    scriptElement.remove()
    scriptElement = null
  }
  if (notificationContainer.value) {
    notificationContainer.value.innerHTML = ''
  }
}

// 渲染通知内容
const renderNotification = async () => {
  console.log('开始渲染通知:', props.notification?.id)
  
  if (!props.notification) {
    console.log('通知为空，不渲染')
    return
  }
  
  // 先清理旧内容
  cleanup()
  
  await nextTick()
  
  if (!notificationContainer.value) {
    console.log('notificationContainer 不存在')
    return
  }
  
  const { content } = props.notification
  
  // 插入 HTML
  if (content.html) {
    console.log('插入 HTML')
    notificationContainer.value.innerHTML = content.html
  }
  
  // 插入 CSS
  if (content.css) {
    console.log('插入 CSS')
    styleElement = document.createElement('style')
    styleElement.textContent = content.css
    document.head.appendChild(styleElement)
  }
  
  // 等待 DOM 更新
  await nextTick()
  
  // 执行 JS（需要特别注意安全性）
  if (content.js) {
    console.log('执行 JS')
    try {
      // 不使用严格模式的立即执行函数，让函数暴露到全局作用域
      // 这样 HTML 中的 onclick 才能访问到这些函数
      scriptElement = document.createElement('script')
      scriptElement.textContent = content.js
      document.body.appendChild(scriptElement)
    } catch (error) {
      console.error('通知脚本执行失败:', error)
    }
  }
  
  console.log('通知渲染完成')
}

watch(() => props.notification, (newVal, oldVal) => {
  console.log('通知变化:', oldVal?.id, '->', newVal?.id)
  if (newVal) {
    renderNotification()
  } else {
    cleanup()
  }
}, { immediate: true, deep: true })

onUnmounted(() => {
  cleanup()
})
</script>

<style scoped>
.notification-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  pointer-events: none;
}

.notification-wrapper {
  pointer-events: auto;
}

/* 默认样式可以留空，让服务端完全控制 */
</style>
