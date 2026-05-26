<template>
  <section class="home-page">
    <header class="status-panel">
      <div :class="['status-card', `status-card--${aiStatus.healthy}`]" @click="checkAi">
        <span class="status-dot"></span>
        <div>
          <span class="status-label">AI 状态</span>
          <strong>{{ aiStatus.message }}</strong>
          <small>点击重新检查</small>
        </div>
      </div>
    </header>

    <div class="overview-grid">
      <article class="metric-panel">
        <span>累计问答</span>
        <strong>{{ qaCount }}</strong>
        <small>次 AI 处理</small>
      </article>
      <article class="metric-panel">
        <span>模拟输入</span>
        <strong>Ctrl+K</strong>
        <small>进入或退出输入模式</small>
      </article>
      <article class="metric-panel">
        <span>AI 问答</span>
        <strong>Ctrl+J</strong>
        <small>回答会写回剪贴板</small>
      </article>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'

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
.home-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 8px;
}

.status-panel,
.metric-panel {
  border: 1px solid var(--ctm-border);
  background: var(--ctm-glass);
  backdrop-filter: blur(22px) saturate(1.25);
  -webkit-backdrop-filter: blur(22px) saturate(1.25);
  border-radius: var(--ctm-radius-lg);
  box-shadow: var(--ctm-shadow-subtle);
}

.status-panel {
  display: block;
  padding: 20px;
}

.status-card small,
.metric-panel small {
  color: var(--ctm-text-muted);
}

.status-card {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 82px;
  padding: 16px;
  border-radius: var(--ctm-radius-md);
  border: 1px solid var(--ctm-border);
  background: rgba(255, 255, 255, 0.62);
  cursor: pointer;
  transition: background-color var(--ctm-transition), border-color var(--ctm-transition);
}

.status-card:hover {
  background: var(--ctm-control-soft);
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--ctm-text-muted);
  box-shadow: 0 0 0 5px rgba(0, 0, 0, 0.05);
  flex: 0 0 auto;
}

.status-card--success .status-dot {
  background: var(--ctm-success);
  box-shadow: 0 0 0 5px var(--ctm-success-soft);
}

.status-card--danger .status-dot {
  background: var(--ctm-danger);
  box-shadow: 0 0 0 5px var(--ctm-danger-soft);
}

.status-label,
.metric-panel span {
  color: var(--ctm-text-muted);
  font-size: 12px;
  font-weight: 700;
}

.status-card strong {
  display: block;
  margin: 4px 0 2px;
  color: var(--ctm-text);
  font-size: 16px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.metric-panel {
  padding: 18px 20px;
}

.metric-panel strong {
  display: block;
  margin: 8px 0 4px;
  color: var(--ctm-text);
  font-size: 26px;
  line-height: 1;
}

code {
  padding: 2px 7px;
  border-radius: 7px;
  color: var(--ctm-text);
  background: var(--ctm-control-soft);
  font-family: Consolas, 'Courier New', monospace;
  font-weight: 700;
}

@media (max-width: 900px) {
  .status-panel {
    grid-template-columns: 1fr;
  }

  .overview-grid {
    grid-template-columns: 1fr;
  }
}
</style>
