<template>
  <el-card class="home-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <div class="header-content">
          <el-icon :size="28" color="#409EFF">
            <Promotion/>
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
                <ChatDotRound/>
              </el-icon>
            </template>
            <template #suffix>
              <span style="font-size: 14px; color: #909399;">次</span>
            </template>
          </el-statistic>
          <div class="ai-status">
            <el-tag @click="checkAi" :type="aiStatus.healthy" effect="light" round>{{ aiStatus.message }}</el-tag>
          </div>
        </el-col>
      </el-row>

      <el-divider style="margin: 12px 0"/>

      <!-- 快捷键说明 -->
      <div class="shortcut-section">
        <h3>
          <el-icon>
            <Pointer/>
          </el-icon>
          快捷键说明
        </h3>
        <el-card v-for="shortcut in shortcuts" :key="shortcut.key" class="shortcut-card" shadow="hover">
          <div class="shortcut-detail">
            <div class="shortcut-icon">
              <el-icon :size="32" :color="shortcut.color">
                <component :is="shortcut.icon"/>
              </el-icon>
            </div>
            <div class="shortcut-info">
              <h4>{{ shortcut.title }}</h4>
              <p>{{ shortcut.description }}</p>
            </div>
            <div class="shortcut-key">
              <el-tag size="large" :type="shortcut.tagType">{{ shortcut.keyValue }}</el-tag>
            </div>
          </div>
        </el-card>
      </div>

      <el-divider style="margin: 12px 0"/>

      <el-divider style="margin: 12px 0"/>

      <!-- 功能状态 -->
      <div class="status-section">
        <h3>
          <el-icon>
            <Monitor/>
          </el-icon>
          功能状态
        </h3>
        <el-descriptions border size="small">
          <el-descriptions-item v-for="status in featureStatuses" :key="status.key" align="center"
                                :label="status.label">
            <StatusTag :enabled="status.enabled" :disabled-text="status.disabledText"/>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <el-divider style="margin: 12px 0"/>

      <!-- 使用指南 -->
      <div class="guide-section">
        <h3>
          <el-icon>
            <Reading/>
          </el-icon>
          使用指南
        </h3>
        <el-timeline class="compact-timeline">
          <el-timeline-item v-for="(step, index) in steps" :key="index" :icon="step.icon" :type="step.type"
                            :size="step.size" :hollow="step.hollow">
            <div class="timeline-content">
              <h4>{{ step.title }}</h4>
              <p>{{ step.description }}</p>
            </div>
          </el-timeline-item>
        </el-timeline>
      </div>
      <!-- 提示信息 -->
      <el-alert title="💡 注意事项" type="error" :closable="false" class="custom-alert error-alert">
        <div class="tips-container">
          <!-- 注意事项1 -->
          <div class="tips-item">
            <div class="tips-desc">
              在<span class="highlight-err">学习通考试客户端</span>中, <span
                class="highlight-err">微信输入法中文模式</span>下, 不要使用<span
                class="highlight-err">模拟输入</span>, 如出现异常请疯狂按<span class="highlight-err">K</span> 终止模拟输入
            </div>
          </div>

          <!-- 注意事项2 -->
          <div class="tips-item">
            <div class="tips-desc">
              开启<span class="highlight-info">AI问答模式</span>，需要去<span
                class="highlight-info">设置页面</span>配置<span
                class="highlight">DeepSeek API</span> 或者<span class="highlight">用户名</span>
            </div>
          </div>
          <div class="tips-item">
            <div class="tips-desc">
              关闭窗口不会退出程序, 请在<span class="highlight-info">系统托盘图标</span>右键菜单中选择退出
            </div>
          </div>
        </div>
      </el-alert>
      <el-alert title="使用建议" type="primary" :closable="false" class="custom-alert">
        <div class="tips-container">
          <!-- 日常使用场景 -->
          <div class="tips-item">
            <div class="tips-header">
              <el-icon class="tips-icon">
                <Monitor/>
              </el-icon>
              <h4 class="tips-title">日常使用场景</h4>
            </div>
            <div class="tips-desc">
              <span class="highlight-require">开启模拟输入</span>，使用模拟输入,可绕过禁止粘贴限制, 设置里可调节打字速度
            </div>
          </div>

          <!-- 分隔线 -->
          <div class="tips-divider"></div>

          <!-- 考试场景 -->
          <div class="tips-item">
            <div class="tips-header">
              <h4 class="tips-title">学习通考试客户端(V4.1.4.25389) - 方案一</h4>
            </div>
            <div class="tips-desc">
              <span class="highlight-require">微信输入法</span> + <span class="highlight-require">开启去除换行</span> +
              <span
                  class="highlight-require">开启AI问答</span>，把问题复制到剪切板，再使用<span
                class="highlight">AI问答</span>，按 <code
                class="code-snippet">v->2->空格</code>
              即可调出AI的回答
            </div>
          </div>
          <div class="tips-item">
            <div class="tips-header">
              <h4 class="tips-title">学习通考试客户端(V4.1.4.25389) - 方案二</h4>
            </div>
            <div class="tips-desc">
              <span class="highlight-require">开启AI问答</span> + <span
                class="highlight-require">管理员模式运行</span>，把问题复制到剪切板，再使用<span
                class="highlight">AI问答</span>,再使用<span
                class="highlight">模拟输入</span>
              即可调出AI的回答
            </div>
          </div>
        </div>
      </el-alert>
    </div>
    <!-- 停止输入提示 -->
    <el-alert title="⚡ 停止模拟输入" type="warning" :closable="false">
      <div style="display: flex; align-items: center; gap: 12px;">
        <el-icon :size="24" color="#E6A23C">
          <VideoPause/>
        </el-icon>
        <div>
          <p style="margin: 0; font-weight: 500;">按下
            <el-tag type="danger" size="large">K</el-tag>
            键可立即停止模拟输入
          </p>
          <el-text size="small" type="info" style="margin-top: 4px; display: block;">
            在模拟输入过程中按 K 键,可以立即中断模拟输入操作
          </el-text>
        </div>
      </div>
    </el-alert>
  </el-card>
</template>

<script setup>
import {ref, computed, onMounted, onUnmounted} from 'vue'
import {
  Promotion,
  ChatDotRound,
  Pointer,
  Document,
  Monitor,
  Reading,
  CopyDocument,
  Key,
  Position,
  VideoPause
} from '@element-plus/icons-vue'

import StatusTag from './common/StatusTag.vue'
import aiMg from "../composables/aiMg.js";
import setMg from "../composables/setMg.js";

const props = defineProps({
  wxInputMode: Boolean,
  textKey: String,
  questionKey: String,
  textProcessEnabled: Boolean,
  aiQAEnabled: Boolean
})


const aiStatus = ref({
  healthy: "info",
  message: '检查AI服务中...'
})


// 问答次数统计
const qaCount = ref(0)
let intervalId = null

// 加载问答次数
const loadQACount = async () => {
  qaCount.value = (await aiMg.getQAHistory()).length;

}

// 快捷键配置
const shortcuts = computed(() => [
  {
    key: 'text',
    title: '模拟输入',
    description: '快速处理剪贴板中的文本内容',
    icon: Document,
    color: '#409EFF',
    tagType: 'primary',
    keyValue: props.textKey
  },
  {
    key: 'question',
    title: 'AI 问答',
    description: '基于 DeepSeek 的智能对话功能',
    icon: ChatDotRound,
    color: '#67C23A',
    tagType: 'success',
    keyValue: props.questionKey
  }
])

// 功能状态配置
const featureStatuses = computed(() => [
  {
    key: 'textProcess',
    label: '模拟输入',
    enabled: props.textProcessEnabled,
    disabledText: '已禁用'
  },
  {
    key: 'aiQA',
    label: 'AI 问答',
    enabled: props.aiQAEnabled,
    disabledText: '已禁用'
  },
  {
    key: 'wxInput',
    label: '去除换行',
    enabled: props.wxInputMode,
    disabledText: '未启用'
  }
])

// 使用指南步骤
const steps = [
  {
    title: '复制文本',
    description: '选择需要处理的文本,按 Ctrl+X 或者Ctrl+C 复制到剪贴板',
    icon: CopyDocument,
    type: 'primary',
    size: 'large'
  },
  {
    title: '按下快捷键',
    description: '根据需要按下对应的全局快捷键',
    icon: Key,
    type: 'success',
    size: 'large'
  },
  {
    title: '处理结果',
    description: '如果使用AI问答，选择自己的方式从剪切板获取答案',
    icon: Position,
    type: 'warning',
    size: 'large'
  }
]


const checkAi = async () => {

  if (setMg.get("deepseekApi") === "" && setMg.get("userName") === "") {
    aiStatus.value = {
      healthy: "danger",
      message: '未配置 DeepSeek API 或 用户名，请前往设置页面配置'
    }
    return
  }

  console.log("检验ai状态");
  aiStatus.value = {
    healthy: "info",
    message: '检查AI服务中...'
  }

  const isHealth = await aiMg.checkHealth();
  console.log(isHealth)

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
}

onMounted(() => {
  loadQACount()
  // 每3秒刷新一次统计
  intervalId = setInterval(loadQACount, 3000)
})

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId)
  }
})

defineExpose({
  checkAi
})
</script>

<style scoped>
.ai-status {
  display: flex;
  justify-content: center;
  margin-top: 5px;

}

.ai-status > span {
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
  border-radius: 4px;
  background-color: #e8f4f8;
}

.highlight-require {
  color: #0d9488; /* 主色：青绿色（代表高效、可靠，贴合工具属性） */
  font-weight: 500;
  padding: 2px 4px;
  border-radius: 4px;
  background-color: #f0fdfa; /* 背景色：主色的浅淡版，柔和不刺眼 */
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
