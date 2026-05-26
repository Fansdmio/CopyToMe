<template>
  <el-card class="home-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <div class="header-content">
          <el-icon :size="28" color="#409EFF">
            <Promotion />
          </el-icon>
          <h2>欢迎使用 CopyToMe</h2>
        </div>
      </div>
    </template>

    <div style="width: 100%;display: flex;flex-direction: column;gap: 10px;margin-bottom: 10px;">
      <!-- 状态概览 -->
      <el-row :gutter="12">
        <el-col :span="24">
          <el-statistic title="AI 问答次数" :value="qaCount">
            <template #prefix>
              <el-icon color="#409EFF">
                <ChatDotRound />
              </el-icon>
            </template>
            <template #suffix>
              <span style="font-size: 14px; color: #909399;">次</span>
            </template>
          </el-statistic>
          <div class="status-bar">
            <el-tag @click="checkAi" :type="aiStatus.healthy" effect="light" round>{{ aiStatus.message }}</el-tag>
          </div>
        </el-col>
      </el-row>

      <el-divider style="margin: 12px 0" />

      <el-alert title="使用建议" type="primary" :closable="false" class="custom-alert">
        <div class="tips-container">
          <!-- 日常使用场景 -->
          <div class="tips-item">
            <div class="tips-header">
              <el-icon class="tips-icon">
                <Monitor />
              </el-icon>
              <h4 class="tips-title">日常使用场景</h4>
            </div>
            <div class="tips-desc">
              <span class="highlight-require">管理员运行</span>, 使用<span class="highlight">Ctrl+K (模拟输入)</span> ,绕过禁止粘贴限制。可以按下<span class="highlight">Ctrl+K (退出)</span>
            </div>
          </div>

          <!-- 分隔线 -->
          <div class="tips-divider"></div>

          <!-- 考试场景 -->
          <div class="tips-item">
            <div class="tips-header">
              <h4 class="tips-title">部分不能切屏的应用的使用场景: 方法一</h4>
            </div>
            <div class="tips-desc">
              <span class="highlight-require">管理员运行</span> + <span class="highlight-err">关闭快速输入模式</span>,先使用<span class="highlight">Ctrl+C</span>把问题复制一下,再使用<span
                class="highlight">Ctrl+J (AI问答)</span>,等待鼠标样式出现短暂的变化,再使用<span class="highlight">Ctrl+K
                (进入模拟输入模式)</span>,之后按一次<span class="highlight">L</span>会输出一个字。结束可以按下<span class="highlight">Ctrl+K
                (退出)</span>
            </div>
          </div>
          <div class="tips-item">
            <div class="tips-header">
              <h4 class="tips-title">部分不能切屏的应用的使用场景: 方法二</h4>
            </div>
            <div class="tips-desc">
              <span class="highlight-require">微信输入法</span> + <span class="highlight-require">开启去除换行</span>
              先使用<span class="highlight">Ctrl+C</span>把问题复制一下，再使用<span class="highlight">Ctrl+J
                (AI问答)</span>,等待鼠标样式出现短暂的变化,按 <code class="code-snippet">v->2->空格</code>
              即可调出AI的回答
            </div>

          </div>
        </div>
      </el-alert>
    </div>

    <!-- 提示信息 -->
    <el-alert title="💡 注意事项" type="error" :closable="false" class="custom-alert error-alert">
      <div class="tips-container">
        <!-- 注意事项1 -->
        <div class="tips-item">
          <div class="tips-desc">
            在<span class="highlight-err">部分应用场景</span>中, 在<span class="highlight-err">微信输入法中文模式</span>下, 使用模拟输入会出现
            <span class="highlight-err">异常</span>,此时请停止模拟输入, 切换到<span class="highlight-err">英文模式</span>后再继续使用
          </div>
        </div>
        <div class="tips-item">
          <div class="tips-desc">
            关闭窗口不会退出程序, 请在<span class="highlight-info">系统托盘图标</span>右键菜单中选择退出
          </div>
        </div>

        <!-- 注意事项2 -->
        <div class="tips-item">
          <div class="tips-desc">
            使用<span class="highlight-info">AI问答</span>,请前往<span class="highlight-info">设置页面</span>配置<span
              class="highlight">API Key</span>
          </div>
        </div>
      </div>
    </el-alert>
    <!-- 停止输入提示 -->
    <el-alert title="⚡ 停止模拟输入" type="warning" :closable="false" style="margin: 8px 0;">
      <div style="display: flex;flex-direction: column; gap: 12px;">
        <div>
          <p style="margin: 0; font-weight: 500;">按下
            <el-tag type="danger" size="large">Ctrl+K</el-tag>
            退出模拟输入模式
          </p>
        </div>
      </div>
    </el-alert>
  </el-card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import {
  Promotion,
  ChatDotRound,
  Monitor
} from '@element-plus/icons-vue'

import aiMg from "../composables/aiMg.js";
import setMg from "../composables/setMg.js";
import mitt from '../utils/mitt.js';
import { info, error } from '@tauri-apps/plugin-log';


const aiStatus = ref({
  healthy: "info",
  message: '检查AI服务中...'
})

// 问答次数统计
const qaCount = ref(0)

// 加载问答次数
const loadQACount = async () => {
  try {
    info("Home: 加载问答次数");
    qaCount.value = (await aiMg.getQAHistory()).length;
    info(`Home: 问答次数: ${qaCount.value}`);
  } catch (e) {
    error(`Home: 加载问答次数失败: ${e}`);
    qaCount.value = 0;
  }
}

mitt.on('history-update', loadQACount);

const checkAi = async () => {
  try {
    if (!setMg.get("deepseekApi")?.trim()) {
      info("Home: 未配置 API Key");
      aiStatus.value = {
        healthy: "danger",
        message: '未配置 API Key，请前往设置页面配置'
      }
      return
    }

    info("Home: 开始检验AI状态");
    aiStatus.value = {
      healthy: "info",
      message: '检查AI服务中...'
    }

    const isHealth = await aiMg.checkHealth();
    info(`Home: AI健康检查结果: ${isHealth}`);

    if (isHealth) {
      aiStatus.value = {
        healthy: "success",
        message: 'AI 服务正常'
      }
    } else {
      aiStatus.value = {
        healthy: "danger",
        message: 'AI 服务异常,点击我再次测试'
      }
    }
  } catch (e) {
    error(`Home: AI健康检查异常: ${e}`);
    aiStatus.value = {
      healthy: "danger",
      message: 'AI 服务检查失败'
    }
  }
}

onMounted(() => {
  try {
    info("Home: 组件挂载");
    loadQACount()
  } catch (e) {
    error(`Home: 组件挂载失败: ${e}`);
  }
})

defineExpose({
  checkAi
})
</script>

<style scoped>
.status-bar {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.status-bar>span {
  cursor: pointer;
}

/* 自定义alert容器 */
.custom-alert {
  border-radius: 12px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 1px solid #e8f4f8 !important;
  background-color: #f0f8fb !important;
  padding: 16px !important;
}

/* 标题样式优化 */
::v-deep(.el-alert__title) {
  font-size: 16px !important;
  font-weight: 600 !important;
  margin-bottom: 12px !important;
}

/* 新增：error类型alert专属样式 - 覆盖基础样式，强化警示性 */
.error-alert {
  border-color: #fee2e2 !important;
  /* 红色系边框 */
  background-color: #fef2f2 !important;
  /* 淡红色背景 */
  box-shadow: 0 4px 12px rgba(237, 100, 100, 0.08) !important;
  /* 红色系阴影 */
}

/* 提示内容容器 */
.tips-container {
  margin-top: 8px;
}

/* 单个提示项 */
.tips-item {
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 8px;
  background-color: #ffffff;
  transition: all 0.2s ease;
}

/* 提示项头部 */
.tips-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

/* 提示项标题 */
.tips-title {
  font-size: 14px;
  font-weight: 500;
  color: #2d3748;
  margin: 0;
}

/* 提示描述文本 */
.tips-desc {
  font-size: 13px;
  line-height: 1.8;
  color: #4a5568;
  padding-left: 26px;
}

.highlight {
  color: #1989fa;
  font-weight: 500;
  padding: 2px 4px;
  margin: 2px 4px;
  border-radius: 4px;
  background-color: #e8f4f8;
}

.highlight-require {
  color: #0d9488;
  /* 主色：青绿色（代表高效、可靠，贴合工具属性） */
  font-weight: 500;
  padding: 2px 4px;
  margin: 2px 4px;
  border-radius: 4px;
  background-color: #f0fdfa;
  /* 背景色：主色的浅淡版，柔和不刺眼 */
}

.highlight-info {
  color: #3f4856;
  /* 中性深色文字，保证可读性 */
  font-weight: 500;
  padding: 2px 6px;
  margin: 2px 4px;
  border-radius: 4px;
  background-color: #f8f9fa;
  /* 浅灰色背景（接近白色） */
  border: 1px solid #e9ecef;
  /* 淡灰色细边框，增强info样式边界感 */
}

.highlight-err {
  color: #dc2626;
  font-weight: 500;
  padding: 2px 4px;
  margin: 2px 4px;
  border-radius: 4px;
  background-color: #fee2e2 !important;
}

/* 代码片段样式 */
.code-snippet {
  display: inline-block;
  padding: 2px 6px;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-size: 12px;
  color: #e53e3e;
  font-family: monospace;
  margin: 0 2px;
}

/* 分隔线 */
.tips-divider {
  height: 1px;
  background-color: #f0f0f0;
  margin: 8px 0;
}

/* 最后一个提示项移除底部间距 */
.tips-item:last-child {
  margin-bottom: 0;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .tips-desc {
    padding-left: 0;
    margin-top: 4px;
  }

  .tips-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .tips-icon {
    margin-bottom: 4px;
  }
}

.home-card {
  border-radius: 12px;
  overflow: hidden;
  animation: fadeIn 0.5s ease-out;
}

.home-card :deep(.el-card__body) {
  padding: 16px;
}

.home-card :deep(.el-card__header) {
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
}

.header-content h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

/* 紧凑的时间线 */
.compact-timeline :deep(.el-timeline-item) {
  padding-bottom: 12px;
}

.compact-timeline :deep(.el-timeline-item__wrapper) {
  padding-left: 24px;
}

/* 快捷键卡片 */
.shortcut-card {
  transition: all 0.3s;
  cursor: default;
}

.shortcut-card :deep(.el-card__body) {
  padding: 12px 16px;
}

.shortcut-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
}

.shortcut-detail {
  display: flex;
  align-items: center;
  gap: 16px;
}

.shortcut-icon {
  flex-shrink: 0;
}

.shortcut-info {
  flex: 1;
}

.shortcut-info h4 {
  margin: 0 0 2px 0;
  font-size: 15px;
  color: #303133;
}

.shortcut-info p {
  margin: 0;
  font-size: 13px;
  color: #909399;
}

.shortcut-key {
  flex-shrink: 0;
}

.shortcut-key .el-tag {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  font-size: 13px;
  padding: 6px 12px;
}

/* 时间线内容 */
.timeline-content h4 {
  margin: 0 0 2px 0;
  font-size: 14px;
  color: #303133;
  font-weight: 600;
}

.timeline-content p {
  margin: 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.4;
}

/* 提示内容 */
.tips-content p {
  margin: 2px 0;
  line-height: 1.6;
  color: #606266;
  font-size: 13px;
}

/* 统计数字样式 */
:deep(.el-statistic) {
  text-align: center;
}

:deep(.el-statistic__head) {
  font-size: 13px;
  color: #909399;
  margin-bottom: 6px;
}

:deep(.el-statistic__number) {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .header-content h2 {
    font-size: 18px;
  }

  h3 {
    font-size: 15px;
  }

  .shortcut-detail {
    flex-direction: column;
    gap: 8px;
    text-align: center;
  }
}

/* 描述列表样式 */
:deep(.el-descriptions__label) {
  font-weight: 500;
}
</style>
