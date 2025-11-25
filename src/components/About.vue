<template>
  <el-card class="about-card" shadow="hover">
    <template #header>
      <div class="header-content">
        <div style="display: flex; align-items: center; gap: 10px;">
          <el-icon :size="24" color="#409EFF">
            <InfoFilled />
          </el-icon>
          <h2>关于</h2>
        </div>
        <el-button type="text" @click="mitt.emit('check-update', true)">
          <span>点我更新</span>
        </el-button>
      </div>
    </template>

    <el-space direction="vertical" :size="20" style="width: 100%">
      <div class="about-content">
        <el-icon :size="64" color="#409EFF">
          <img src="/src/assets/logo.png" style="width: 50px;"></img>
        </el-icon>
        <h1>CopyToMe & Tauri</h1>
        <el-text type="info">版本 {{ version }}</el-text>
        <div style="display: flex;flex-direction: column;gap: 4px;margin-top: 10px;">
          <span>免费软件，请勿上当受骗</span>
          <el-link target="_blank" href="https://cp.uuyo.fun" underline="never" type="primary">官网链接</el-link>
        </div>
      </div>

      <!-- 图片占位符区域 -->
      <div class="image-placeholder-container">
        <div v-if="!showImage" class="image-placeholder" @click="showImage = true">
          <el-icon :size="64" color="#c0c4cc">
            <Picture />
          </el-icon>
          <div class="placeholder-text">
            <p class="sub-text">作者的萝莉照</p>
          </div>
        </div>
        <div v-else class="image-container">
          <el-image src="https://cp.uuyo.fun/zsm.jpg" fit="contain" class="about-image"
            :preview-src-list="['https://cp.uuyo.fun/zsm.jpg']">
            <template #error>
              <div class="image-placeholder">
                <el-icon :size="40" color="#f56c6c">
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
    </el-space>
  </el-card>
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
.about-card {
  border-radius: 12px;
  overflow: hidden;
}

.about-card :deep(.el-card__body) {
  padding: 16px;
}

.about-card :deep(.el-card__header) {
  padding: 12px 16px;
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
  justify-content: space-between;
}

.header-content h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.about-content {
  text-align: center;
  padding: 12px 0;
}

.about-content h1 {
  margin: 12px 0 6px;
  font-size: 24px;
  color: #303133;
}

/* 图片占位符样式 */
.image-placeholder-container {
  width: 100%;
  display: flex;
  justify-content: center;
}

.image-placeholder {
  width: 400px;
  height: 400px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
  border: 2px dashed #c0c4cc;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.image-placeholder:hover {
  border-color: #409EFF;
  background: linear-gradient(135deg, #ecf5ff 0%, #d9ecff 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
}

.placeholder-text {
  text-align: center;
}

.placeholder-text .main-text {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 500;
  color: #606266;
}

.placeholder-text .sub-text {
  margin: 0;
  font-size: 13px;
  color: #909399;
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
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.about-image :deep(.el-image__inner) {
  border-radius: 12px;
}

.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  width: 100%;
  color: #909399;
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
