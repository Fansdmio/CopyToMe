<template>
  <section class="about-page">
    <header class="about-header">
        <div class="header-title">
          <el-icon :size="22">
            <InfoFilled />
          </el-icon>
          <h2>关于</h2>
        </div>
        <el-button type="text" @click="mitt.emit('check-update', true)">
          <span>点我更新</span>
        </el-button>
    </header>

      <div class="about-content">
        <div class="brand-block">
          <div class="brand-icon">
            <img src="/src/assets/logo.png" alt="CopyToMe" />
          </div>
          <h1>CopyToMe</h1>
          <el-text type="info">版本 {{ version }}</el-text>
          <div class="brand-links">
            <div class="brand-links-row">
              <a :href="`${setMg.baseUrl}`" target="_blank" class="brand-link-item">
                <svg class="link-icon" viewBox="0 0 16 16" fill="none">
                  <path d="M6.5 2.5h-3a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                  <path d="M9 1.5h4.5V6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M13.5 1.5L7.5 7.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                </svg>
                <span>官网链接</span>
              </a>
              <a href="https://github.com/Fansdmio/CopyToMe" target="_blank" class="brand-link-item">
                <svg class="link-icon" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
                </svg>
                <span>GitHub</span>
              </a>
            </div>
            <span class="brand-hint">免费软件，请勿上当受骗</span>
            <span class="brand-star-hint">有帮助的话，请帮作者点一个 star</span>
          </div>
        </div>

        <!-- 赞赏图片归入关于卡片内部，避免内容上下割裂。 -->
        <div class="image-placeholder-container">
          <div v-if="!showImage" class="image-placeholder" @click="showImage = true">
            <el-icon :size="58">
              <Picture />
            </el-icon>
            <div class="placeholder-text">
              <p class="sub-text">查看作者萝莉照</p>
            </div>
          </div>
          <div v-else class="image-container">
            <el-image :src="`${setMg.baseUrl}/zsm.jpg`" fit="contain" class="about-image"
              :preview-src-list="[`${setMg.baseUrl}/zsm.jpg`]" :preview-teleported="true" :z-index="4000">
              <template #error>
                <div class="image-placeholder">
                  <el-icon :size="40">
                    <PictureFilled />
                  </el-icon>
                  <p>图片加载失败</p>
                </div>
              </template>
            </el-image>
            <el-button type="info" size="small" text @click="showImage = false" class="hide-image-btn">
              <el-icon>
                <Close />
              </el-icon>
              隐藏图片
            </el-button>
          </div>
        </div>
      </div>
  </section>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'
import {
  InfoFilled,
  Picture,
  PictureFilled,
  Close
} from '@element-plus/icons-vue'
import setMg from '../composables/setMg'
import mitt from '../utils/mitt'
const { version } = setMg

const props = defineProps({
  activeMenu: {
    type: String,
    default: 'about'
  }
})

// 图片显示状态
const showImage = ref(false)

// 萝莉照智能提示计时逻辑
let imageShownAt = null
let supportCheckTimer = null

// 检查是否需要弹出支持提示
const checkAndMaybePrompt = () => {
  if (imageShownAt === null) return
  const elapsed = Date.now() - imageShownAt
  imageShownAt = null  // 重置防止重复触发
  if (elapsed < 30000 && !setMg.settings.hasSupported) {
    mitt.emit('show-support-prompt')
  }
}

watch(showImage, (newVal) => {
  if (newVal) {
    imageShownAt = Date.now()
  } else {
    checkAndMaybePrompt()
  }
})

watch(() => props.activeMenu, (newMenu) => {
  if (newMenu !== 'about' && imageShownAt !== null) {
    if (supportCheckTimer) clearTimeout(supportCheckTimer)
    supportCheckTimer = setTimeout(() => {
      checkAndMaybePrompt()
    }, 100)
  }
})

onUnmounted(() => {
  if (supportCheckTimer) clearTimeout(supportCheckTimer)
})
</script>

<style scoped>
.about-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.about-header,
.about-content,
.image-placeholder,
.image-container {
  border: 1px solid var(--ctm-border);
  background: var(--ctm-surface);
  border-radius: var(--ctm-radius-lg);
  box-shadow: var(--ctm-shadow-subtle);
}

.about-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--ctm-control);
}

.header-title h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: var(--ctm-text);
}

.about-content {
  text-align: center;
  padding: 34px 28px 30px;
}

.brand-block {
  padding-bottom: 26px;
}

.brand-icon {
  width: 72px;
  height: 72px;
  display: grid;
  place-items: center;
  margin: 0 auto;
  border-radius: 22px;
  background: var(--ctm-surface-muted);
  border: 1px solid var(--ctm-border);
}

.brand-icon img {
  width: 48px;
  height: 48px;
  object-fit: contain;
}

.about-content h1 {
  margin: 12px 0 6px;
  font-size: 28px;
  color: var(--ctm-text);
}

.brand-links {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
}

.brand-links-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 20px;
}

.brand-link-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  color: #0066cc;
  text-decoration: none;
  transition: color var(--ctm-transition);
}

.brand-link-item:hover {
  color: #004499;
}

.link-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.brand-hint {
  font-size: 12px;
  color: var(--ctm-text-muted);
}

.brand-star-hint {
  font-size: 12px;
  color: var(--ctm-text-muted);
}

/* 图片占位符样式 */
.image-placeholder-container {
  width: 100%;
  display: flex;
  justify-content: center;
  padding-top: 26px;
  border-top: 1px solid var(--ctm-border);
}

.image-placeholder {
  width: 400px;
  height: 400px;
  color: var(--ctm-text-muted);
  background: var(--ctm-surface-muted);
  border-style: dashed;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  cursor: pointer;
  transition: border-color var(--ctm-transition), background-color var(--ctm-transition), color var(--ctm-transition);
}

.image-placeholder:hover {
  color: var(--ctm-control);
  border-color: var(--ctm-control);
  background: var(--ctm-control-soft);
}

.placeholder-text {
  text-align: center;
}

.placeholder-text .main-text {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--ctm-text-soft);
}

.placeholder-text .sub-text {
  margin: 0;
  font-size: 13px;
  color: var(--ctm-text-muted);
}

.image-container {
  width: 100%;
  max-width: 800px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.about-image {
  width: 100%;
  max-height: 500px;
  border-radius: var(--ctm-radius-lg);
  overflow: hidden;
  box-shadow: var(--ctm-shadow-subtle);
}

.about-image :deep(.el-image__inner) {
  border-radius: var(--ctm-radius-lg);
}

.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  width: 100%;
  color: var(--ctm-text-muted);
}

.image-error p {
  margin-top: 12px;
  font-size: 14px;
}

.hide-image-btn {
  margin-top: 4px;
}

.project-info {
  width: 100%;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .image-placeholder {
    width: 300px;
    height: 300px;
  }

  .placeholder-text .main-text {
    font-size: 14px;
  }

  .placeholder-text .sub-text {
    font-size: 12px;
  }
}
</style>
