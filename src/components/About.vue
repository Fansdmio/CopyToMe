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
            <span>免费软件，请勿上当受骗</span>
            <el-link target="_blank" :href="`${setMg.baseUrl}`" underline="never" type="primary">官网链接</el-link>
          </div>
        </div>

        <!-- 赞赏图片归入关于卡片内部，避免内容上下割裂。 -->
        <div class="image-placeholder-container">
          <div v-if="!showImage" class="image-placeholder" @click="showImage = true">
            <el-icon :size="58">
              <Picture />
            </el-icon>
            <div class="placeholder-text">
              <p class="sub-text">点击查看赞赏图片</p>
            </div>
          </div>
          <div v-else class="image-container">
            <el-image :src="`${setMg.baseUrl}/zsm.jpg`" fit="contain" class="about-image"
              :preview-src-list="[`${setMg.baseUrl}/zsm.jpg`]">
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
import { ref } from 'vue'
import {
  InfoFilled,
  Picture,
  PictureFilled,
  Close
} from '@element-plus/icons-vue'
import setMg from '../composables/setMg'
import mitt from '../utils/mitt'
const { version } = setMg

// 图片显示状态
const showImage = ref(false)
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
  gap: 4px;
  margin-top: 10px;
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
