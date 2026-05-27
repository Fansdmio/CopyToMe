<template>
  <section class="tutorial-page">
    <div v-if="confettiPieces.length" class="confetti-layer" aria-hidden="true">
      <span
        v-for="piece in confettiPieces"
        :key="piece.id"
        class="confetti-piece"
        :style="piece.style"
      ></span>
    </div>

    <header class="tutorial-hero">
      <div>
        <span class="tutorial-kicker">新手教程</span>
        <h2>{{ stageTitle }}</h2>
        <p>{{ stageHint }}</p>
      </div>
      <div class="stage-meter" aria-hidden="true">
        <span :class="{ active: stage === 'inputting' }"></span>
        <span :class="{ active: stage === 'waiting' }"></span>
        <span :class="{ active: answerStages.includes(stage) }"></span>
        <span :class="{ active: stage === 'passed' }"></span>
      </div>
    </header>

    <div class="tutorial-content">
      <article class="practice-card">
        <div class="practice-heading">
          <span>题目</span>
        </div>

        <p class="practice-topic" @copy.prevent @cut.prevent>{{ currentTopic }}</p>
      </article>

      <article class="practice-card input-card">
        <div class="practice-heading">
          <span>{{ inputTitle }}</span>
          <small>{{ inputStatusText }}</small>
        </div>

        <div
          class="tutorial-input-shell"
          @copy.capture="handleInputCopy"
          @cut.capture="handleInputCopy"
          @paste.capture.prevent="blockPaste"
          @drop.capture.prevent="blockPaste"
          @contextmenu.prevent
        >
          <el-input
            ref="inputRef"
            v-model="questionText"
            type="textarea"
            :rows="6"
            resize="none"
            :placeholder="inputPlaceholder"
            :disabled="stage === 'grading' || stage === 'passed'"
            @keydown="handleInputKeydown"
          />
        </div>

        <div v-if="showSubmitArea" class="submit-row">
          <el-button
            type="primary"
            :loading="stage === 'grading'"
            :disabled="!canSubmitAnswer"
            @click="submitAnswer"
          >
            提交答案
          </el-button>
        </div>

        <div v-if="gradingResult" :class="['grading-result', gradingResult.passed ? 'is-passed' : 'is-failed']">
          <strong>{{ gradingResult.passed ? '教程完成' : '还差一点' }} · {{ gradingResult.score }} 分</strong>
          <p>{{ gradingResult.comment }}</p>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { ElMessage } from 'element-plus'

import setMg from '../composables/setMg.js'
import aiMg from '../composables/aiMg.js'
import mitt from '../utils/mitt.js'
import { formatShortcutForDisplay } from '../utils/shortcutFormat.js'

const settings = setMg.settings
const answerStages = ['answering', 'grading', 'failed']
const stage = ref('inputting')
const questionText = ref('')
const currentTopic = ref('')
const waitingQuestion = ref('')
const gradingResult = ref(null)
const confettiPieces = ref([])
const inputRef = ref(null)
let unsubscribeAiCompleted = null
let confettiTimer = null

const tutorialTopics = [
  '高等数学中，拉格朗日乘数法为什么能用于求条件极值？',
  '线性代数中，矩阵的特征值和特征向量有什么几何意义？',
  '大学物理中，电磁感应定律如何解释发电机的工作原理？',
  '数据结构中，为什么哈希表查询通常比二叉搜索树更快？',
  '现代文学中，鲁迅作品的叙事视角如何影响主题表达？',
  '中国古代史中，科举制度对社会流动产生了哪些影响？',
  '西方哲学中，康德所说的“先验”是什么意思？',
  '宏观经济学中，通货膨胀和失业率之间为什么可能存在短期权衡？'
]

const textShortcutText = computed(() => formatShortcutForDisplay(settings.textKey))
const isQuestionReady = computed(() => {
  const text = questionText.value.trim()
  return text.endsWith('?') || text.endsWith('？')
})

const stageTitle = computed(() => {
  if (stage.value === 'waiting') return '请等待 AI 回答完成'
  if (stage.value === 'answering') return '提交你的答案'
  if (stage.value === 'grading') return 'AI 正在评分'
  if (stage.value === 'passed') return '教程完成'
  if (stage.value === 'failed') return '还差一点'
  return '输入你的问题并复制'
})

const stageHint = computed(() => {
  if (stage.value === 'waiting') {
    return 'CopyToMe 正在处理你复制的问题，鼠标光标变化后代表回答已经写入剪贴板。'
  }

  if (stage.value === 'answering' && settings.wxInputMode) {
    return '请在中文模式下依次按 v -> 2 -> 空格 查看答案。'
  }

  if (stage.value === 'answering') {
    return `请使用 ${textShortcutText.value} 查看答案；再次按下 ${textShortcutText.value} 可以暂停和恢复继续，按下 K 可以重新再来。`
  }

  if (stage.value === 'grading') {
    return 'AI 正在根据题目和你的答案评分，请稍等。'
  }

  if (stage.value === 'passed') {
    return '你已经完成教程，可以开始正式使用 CopyToMe 了。'
  }

  if (stage.value === 'failed') {
    return '根据建议改一改答案，再提交一次就行。'
  }

  return '在输入框里输入你的问题，后面加上 ? 或 ？ ，然后复制。'
})

const inputTitle = computed(() => answerStages.includes(stage.value) || stage.value === 'passed' ? '提交答案' : '输入问题')

const inputPlaceholder = computed(() => {
  if (answerStages.includes(stage.value)) {
    return '根据题目和 AI 回答，在这里写下你的答案'
  }

  return '在这里输入你的问题，最后加上 ? 或 ？'
})

const inputStatusText = computed(() => {
  if (stage.value === 'passed') return '已通过'
  if (stage.value === 'failed') return '可继续修改'
  if (stage.value === 'grading') return '评分中'
  if (stage.value === 'answering') return '等待提交'
  if (stage.value === 'waiting') return '等待回答'
  return isQuestionReady.value ? '格式正确，请复制完整问题' : '末尾需要 ? 或 ？'
})

const showSubmitArea = computed(() => ['answering', 'grading', 'failed'].includes(stage.value))
const canSubmitAnswer = computed(() => showSubmitArea.value && stage.value !== 'grading' && questionText.value.trim().length > 0)

const pickRandomTopic = () => {
  const index = Math.floor(Math.random() * tutorialTopics.length)
  currentTopic.value = tutorialTopics[index]
}

const resetTutorial = async (focusInput = true) => {
  pickRandomTopic()
  stage.value = 'inputting'
  questionText.value = ''
  waitingQuestion.value = ''
  gradingResult.value = null
  confettiPieces.value = []
  if (confettiTimer) {
    clearTimeout(confettiTimer)
    confettiTimer = null
  }

  await nextTick()
  if (focusInput) {
    inputRef.value?.focus?.()
  }
}

const blockPaste = () => {
  ElMessage.warning('教程输入框禁止粘贴，请手动输入')
}

const handleInputKeydown = (event) => {
  const key = event.key?.toLowerCase()
  const isPasteShortcut = (event.ctrlKey || event.metaKey) && key === 'v'
  const isShiftInsert = event.shiftKey && key === 'insert'

  if (isPasteShortcut || isShiftInsert) {
    event.preventDefault()
    blockPaste()
  }
}

const getTextareaElement = (target) => {
  if (inputRef.value?.textarea) return inputRef.value.textarea
  if (target?.tagName === 'TEXTAREA') return target
  return target?.querySelector?.('textarea') || null
}

const getSelectedInputText = (target) => {
  const textarea = getTextareaElement(target)
  if (!textarea || typeof textarea.selectionStart !== 'number') return ''

  return textarea.value.slice(textarea.selectionStart, textarea.selectionEnd)
}

const handleInputCopy = (event) => {
  if (!isQuestionReady.value) return

  const normalizedQuestion = questionText.value.trim()
  const selectedText = getSelectedInputText(event.target).trim()

  // 复制和剪切都会写入剪贴板，选中内容就是后续 AI 处理需要匹配的问题。
  if (!selectedText || selectedText !== normalizedQuestion) {
    ElMessage.warning('请选中并复制完整问题再继续')
    return
  }

  waitingQuestion.value = normalizedQuestion
  stage.value = 'waiting'
}

const handleAiCompleted = (payload = {}) => {
  if (stage.value !== 'waiting') return
  if (payload.question?.trim() !== waitingQuestion.value) return

  stage.value = 'answering'
  questionText.value = ''
  gradingResult.value = null
  nextTick(() => inputRef.value?.focus?.())
}

const buildGradingQuestion = (answer) => JSON.stringify({
  topic: currentTopic.value,
  userQuestion: waitingQuestion.value,
  userAnswer: answer
})

const parseGradingResult = (rawText) => {
  if (!rawText) return null

  const jsonText = rawText.match(/\{[\s\S]*\}/)?.[0] || rawText
  try {
    const result = JSON.parse(jsonText)
    const score = Number(result.score)

    if (!Number.isFinite(score)) return null

    return {
      score: Math.max(0, Math.min(100, Math.round(score))),
      comment: String(result.comment || '没有给出评语'),
      passed: score > 60
    }
  } catch {
    return null
  }
}

const submitAnswer = async () => {
  const answer = questionText.value.trim()
  if (!answer || stage.value === 'grading') return

  stage.value = 'grading'

  const gradingPrompt = [
    '你是大学入门教程的评分老师。',
    '请根据题目、用户向 AI 提出的问题、用户最终写下的答案评分。',
    '评分标准：0 到 100 分，答案大致正确、表达清楚即可给 60 分以上；明显无关或过短应低分。',
    '只返回 JSON，不要 Markdown，不要额外文字。',
    'JSON 格式：{"score":数字,"comment":"中文简短评语","passed":布尔值}',
    '注意：passed 必须等于 score > 60。'
  ].join('\n')

  const rawResult = await aiMg.askAi(buildGradingQuestion(answer), gradingPrompt, false)
  const result = parseGradingResult(rawResult)

  if (!result) {
    stage.value = 'failed'
    ElMessage.error('AI 评分失败，请稍后重试')
    return
  }

  gradingResult.value = result
  if (result.passed) {
    stage.value = 'passed'
    launchConfetti()
    return
  }

  stage.value = 'failed'
}

const launchConfetti = () => {
  const colors = ['#1d1d1f', '#2f8f5b', '#b26a00', '#c2413a', '#6e6e73']
  confettiPieces.value = Array.from({ length: 34 }, (_, index) => ({
    id: `${Date.now()}-${index}`,
    style: {
      left: `${8 + Math.random() * 84}%`,
      backgroundColor: colors[index % colors.length],
      animationDelay: `${Math.random() * 0.32}s`,
      animationDuration: `${1.6 + Math.random() * 0.9}s`,
      transform: `rotate(${Math.random() * 180}deg)`
    }
  }))

  if (confettiTimer) clearTimeout(confettiTimer)
  confettiTimer = setTimeout(() => {
    confettiPieces.value = []
    confettiTimer = null
  }, 3000)
}

onMounted(() => {
  resetTutorial(false)
  unsubscribeAiCompleted = mitt.on('ai-answer-completed', handleAiCompleted)
})

onUnmounted(() => {
  unsubscribeAiCompleted?.()
  if (confettiTimer) clearTimeout(confettiTimer)
})

defineExpose({
  resetTutorial
})
</script>

<style scoped>
.tutorial-page {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 8px;
}

.confetti-layer {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  overflow: hidden;
}

.confetti-piece {
  position: absolute;
  top: -18px;
  width: 8px;
  height: 14px;
  border-radius: 2px;
  opacity: 0.92;
  animation: tutorialConfettiFall 2s ease-out forwards;
}

.tutorial-hero,
.practice-card {
  border: 1px solid var(--ctm-border);
  border-radius: var(--ctm-radius-lg);
  background: var(--ctm-glass);
  box-shadow: var(--ctm-shadow-subtle);
  backdrop-filter: blur(22px) saturate(1.25);
  -webkit-backdrop-filter: blur(22px) saturate(1.25);
}

.tutorial-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 22px;
}

.tutorial-kicker {
  color: var(--ctm-text-muted);
  font-size: 12px;
  font-weight: 760;
}

.tutorial-hero h2 {
  margin: 5px 0 8px;
  color: var(--ctm-text);
  font-size: 22px;
  font-weight: 840;
  letter-spacing: 0;
}

.tutorial-hero p {
  max-width: 640px;
  margin: 0;
  color: var(--ctm-text-soft);
  font-size: 14px;
  font-weight: 620;
  line-height: 1.7;
}

.stage-meter {
  display: flex;
  gap: 8px;
  flex: 0 0 auto;
}

.stage-meter span {
  width: 36px;
  height: 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.1);
}

.stage-meter span.active {
  background: var(--ctm-control);
}

.tutorial-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.practice-card {
  padding: 18px;
}

.practice-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.practice-heading span {
  color: var(--ctm-text);
  font-size: 15px;
  font-weight: 800;
}

.practice-heading small {
  color: var(--ctm-text-muted);
  font-size: 12px;
  font-weight: 700;
}

.practice-topic {
  margin: 0;
  padding: 18px 22px;
  border: 1px solid var(--ctm-border);
  border-radius: var(--ctm-radius-md);
  color: var(--ctm-text);
  background: rgba(255, 255, 255, 0.66);
  font-size: 18px;
  font-weight: 780;
  line-height: 1.75;
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
}

.tutorial-input-shell {
  border-radius: var(--ctm-radius-md);
}

.input-card :deep(.el-textarea__inner) {
  min-height: 170px !important;
  padding: 16px;
  color: var(--ctm-text);
  background: rgba(255, 255, 255, 0.74);
  font-size: 15px;
  font-weight: 620;
  line-height: 1.65;
}

.submit-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

.grading-result {
  margin-top: 14px;
  padding: 14px 16px;
  border: 1px solid var(--ctm-border);
  border-radius: var(--ctm-radius-md);
  background: rgba(255, 255, 255, 0.68);
}

.grading-result strong,
.grading-result p {
  display: block;
}

.grading-result strong {
  color: var(--ctm-text);
  font-size: 14px;
  font-weight: 820;
}

.grading-result p {
  margin: 6px 0 0;
  color: var(--ctm-text-soft);
  font-size: 13px;
  font-weight: 620;
  line-height: 1.6;
}

.grading-result.is-passed {
  border-color: rgba(47, 143, 91, 0.24);
  background: rgba(247, 253, 249, 0.78);
}

.grading-result.is-failed {
  border-color: rgba(178, 106, 0, 0.24);
  background: rgba(255, 250, 241, 0.78);
}

@keyframes tutorialConfettiFall {
  0% {
    opacity: 0;
    transform: translate3d(0, -20px, 0) rotate(0deg);
  }
  12% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translate3d(24px, 520px, 0) rotate(520deg);
  }
}

@media (max-width: 900px) {
  .tutorial-hero {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
