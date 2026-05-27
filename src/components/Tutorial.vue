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
        <span class="tutorial-kicker">{{ modeLabel }}</span>
        <h2>{{ stageTitle }}</h2>
      </div>
      <div class="stage-meter" aria-hidden="true">
        <span
          v-for="item in stageMeter"
          :key="item"
          :class="{ active: item === activeMeter }"
        ></span>
      </div>
    </header>

    <div class="tutorial-tabs" role="tablist" aria-label="教程类型">
      <button type="button" :class="{ active: tutorialMode === 'basic' }" @click="switchTutorialMode('basic')">
        基础教程
      </button>
      <button
        type="button"
        :class="{ active: tutorialMode === 'advanced' }"
        :disabled="!settings.tutorialBasicCompleted"
        @click="switchTutorialMode('advanced')"
      >
        进阶教程
        <small v-if="!settings.tutorialBasicCompleted">完成基础后解锁</small>
      </button>
    </div>

    <div v-if="advancedQuickInputNotice" class="quick-input-note">
      已为进阶教程关闭快速输入模式，离开教程后会自动恢复。
    </div>

    <div class="tutorial-content">
      <article class="practice-card">
        <div class="practice-heading">
          <span>题目</span>
        </div>

        <p class="practice-topic" @copy.prevent @cut.prevent>{{ currentTopic }}</p>
      </article>

      <article v-if="isAdvancedTrainingStage" class="practice-card training-card">
        <div class="practice-heading">
          <span>{{ trainingTitle }}</span>
          <small>{{ trainingStatusText }}</small>
        </div>
        <p class="instruction-text">{{ stageHint }}</p>
        <div class="practice-heading practice-heading--target">
          <span>练习输入框</span>
          <small>先点这里聚焦</small>
        </div>
        <el-input
          ref="practiceInputRef"
          v-model="practiceText"
          type="textarea"
          :rows="6"
          resize="none"
          placeholder="按提示使用进行练习模拟输入"
        />
        <div class="submit-row">
          <el-button v-if="canManualAdvanceTraining" type="primary" @click="goNextTrainingStep">
            我已尝试，下一步
          </el-button>
        </div>
      </article>

      <article v-else class="practice-card input-card">
        <div class="practice-heading">
          <span>{{ inputTitle }}</span>
          <small>{{ inputStatusText }}</small>
        </div>

        <p class="instruction-text">{{ stageHint }}</p>

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
            :rows="8"
            resize="none"
            :placeholder="inputPlaceholder"
            :disabled="isInputDisabled"
            @keydown="handleInputKeydown"
          />
        </div>

        <div v-if="showSubmitArea" class="submit-row">
          <span v-if="tutorialMode === 'advanced' && answerTextLength < 500" class="answer-count">
            还需要 {{ 500 - answerTextLength }} 字
          </span>
          <el-button
            type="primary"
            :loading="isGradingStage"
            :disabled="!canSubmitAnswer"
            @click="submitAnswer"
          >
            提交答案
          </el-button>
        </div>

        <div v-if="gradingResult" :class="['grading-result', gradingResult.passed ? 'is-passed' : 'is-failed']">
          <strong>{{ gradingResult.passed ? completeTitle : '还差一点' }} · {{ gradingResult.score }} 分</strong>
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
const tutorialMode = ref('basic')
const stage = ref('inputting')
const questionText = ref('')
const currentTopic = ref('')
const waitingQuestion = ref('')
const practiceText = ref('')
const gradingResult = ref(null)
const confettiPieces = ref([])
const inputRef = ref(null)
const practiceInputRef = ref(null)
const advancedQuickInputNotice = ref(false)
let unsubscribeAiCompleted = null
let unsubscribeTypingModeChanged = null
let confettiTimer = null
let shouldRestoreQuickInput = false

const basicTopics = [
  '高等数学中，拉格朗日乘数法为什么能用于求条件极值？',
  '线性代数中，矩阵的特征值和特征向量有什么几何意义？',
  '大学物理中，电磁感应定律如何解释发电机的工作原理？',
  '数据结构中，为什么哈希表查询通常比二叉搜索树更快？',
  '现代文学中，鲁迅作品的叙事视角如何影响主题表达？',
  '中国古代史中，科举制度对社会流动产生了哪些影响？',
  '西方哲学中，康德所说的“先验”是什么意思？',
  '宏观经济学中，通货膨胀和失业率之间为什么可能存在短期权衡？'
]

const advancedTopics = [
  '作文题：请以“人工智能如何改变大学学习方式”为题，写一篇不少于 500 字的议论文。',
  '作文题：请以“在效率与专注之间”为题，写一篇不少于 500 字的议论文。',
  '作文题：请以“技术进步是否一定带来更好的生活”为题，写一篇不少于 500 字的议论文。',
  '作文题：请以“独立思考在信息时代的价值”为题，写一篇不少于 500 字的议论文。',
  '作文题：请以“青年如何面对不确定的未来”为题，写一篇不少于 500 字的议论文。'
]

const textShortcutText = computed(() => formatShortcutForDisplay(settings.textKey))
const isQuestionReady = computed(() => {
  const text = questionText.value.trim()
  return text.endsWith('?') || text.endsWith('？')
})
const isAdvanced = computed(() => tutorialMode.value === 'advanced')
const isGradingStage = computed(() => ['grading', 'advancedGrading'].includes(stage.value))
const isPassedStage = computed(() => ['passed', 'advancedPassed'].includes(stage.value))
const answerTextLength = computed(() => questionText.value.trim().length)
const isAdvancedTrainingStage = computed(() => [
  'advancedEnterMode',
  'advancedTryL',
  'advancedTryJ',
  'advancedTryExit',
  'advancedTryRestart'
].includes(stage.value))

const stageMeter = computed(() => isAdvanced.value
  ? ['question', 'answer', 'practice', 'submit', 'complete']
  : ['question', 'answer', 'complete']
)

const activeMeter = computed(() => {
  if (['inputting', 'advancedInputting'].includes(stage.value)) return 'question'
  if (['waiting', 'advancedWaiting'].includes(stage.value)) return 'answer'
  if (['answering', 'failed', 'grading', 'passed'].includes(stage.value)) return stage.value === 'passed' ? 'complete' : 'answer'
  if (['advancedEnterMode', 'advancedTryL', 'advancedTryJ', 'advancedTryExit', 'advancedTryRestart'].includes(stage.value)) return 'practice'
  if (['advancedAnswering', 'advancedFailed', 'advancedGrading'].includes(stage.value)) return 'submit'
  if (stage.value === 'advancedPassed') return 'complete'
  return 'question'
})

const modeLabel = computed(() => isAdvanced.value ? '进阶教程' : '基础教程')
const completeTitle = computed(() => isAdvanced.value ? '进阶教程完成' : '教程完成')

const stageTitle = computed(() => {
  if (['waiting', 'advancedWaiting'].includes(stage.value)) return '请等待 AI 回答完成'
  if (stage.value === 'advancedEnterMode') return '进入模拟输入操作模式'
  if (stage.value === 'advancedTryL') return '练习逐字输入'
  if (stage.value === 'advancedTryJ') return '练习自动输入'
  if (stage.value === 'advancedTryExit') return '练习退出操作模式'
  if (stage.value === 'advancedTryRestart') return '练习重新再来'
  if (['answering', 'advancedAnswering'].includes(stage.value)) return '提交你的答案'
  if (isGradingStage.value) return 'AI 正在评分'
  if (isPassedStage.value) return completeTitle.value
  if (['failed', 'advancedFailed'].includes(stage.value)) return '还差一点'
  return '输入你的问题并复制'
})

const stageHint = computed(() => {
  if (['waiting', 'advancedWaiting'].includes(stage.value)) {
    return 'CopyToMe 正在处理你复制的问题，鼠标光标变化后代表回答已经写入剪贴板。'
  }
  if (isAdvancedTrainingStage.value) return trainingDescription.value
  if (['answering', 'advancedAnswering'].includes(stage.value)) {
    if (isAdvanced.value) {
      return '请写一篇不少于 500 字的作文，然后提交给 AI 评分。'
    }

    if (settings.wxInputMode) {
      return '请先在中文模式下依次按 v -> 2 -> 空格 调出答案，再根据答案写下你的答案并提交给 AI 评分。'
    }

    return `请先使用 ${textShortcutText.value} 调出答案，再根据答案写下你的答案并提交给 AI 评分。`
  }
  if (isGradingStage.value) return 'AI 正在根据题目和你的答案评分，请稍等。'
  if (isPassedStage.value) return '你已经完成当前教程，可以开始正式使用 CopyToMe 了。'
  if (['failed', 'advancedFailed'].includes(stage.value)) return '根据建议改一改答案，再提交一次就行。'
  return isAdvanced.value
    ? '想问的问题后面加上问号，然后复制。'
    : '想问的问题后面加上问号 ，然后复制。'
})

const inputTitle = computed(() => ['answering', 'failed', 'grading', 'passed', 'advancedAnswering', 'advancedFailed', 'advancedGrading', 'advancedPassed'].includes(stage.value)
  ? '提交答案'
  : '回答问题'
)

const inputPlaceholder = computed(() => {
  if (['advancedAnswering', 'advancedFailed'].includes(stage.value)) return '在这里写下不少于 500 字的作文答案'
  if (['answering', 'failed'].includes(stage.value)) return '根据题目和 AI 回答，在这里写下你的答案'
  return '在这里输入你的问题，最后加上 ? 或 ？'
})

const inputStatusText = computed(() => {
  if (isPassedStage.value) return '已通过'
  if (['failed', 'advancedFailed'].includes(stage.value)) return '可继续修改'
  if (isGradingStage.value) return '评分中'
  if (['answering', 'advancedAnswering'].includes(stage.value)) return isAdvanced.value ? `${answerTextLength.value}/500 字` : '等待提交'
  if (['waiting', 'advancedWaiting'].includes(stage.value)) return '等待回答'
  return isQuestionReady.value ? '格式正确，请复制完整问题' : '末尾需要 ? 或 ？'
})

const showSubmitArea = computed(() => ['answering', 'grading', 'failed', 'advancedAnswering', 'advancedGrading', 'advancedFailed'].includes(stage.value))
const canSubmitAnswer = computed(() => {
  if (!showSubmitArea.value || isGradingStage.value) return false
  if (isAdvanced.value) return answerTextLength.value >= 500
  return answerTextLength.value > 0
})
const isInputDisabled = computed(() => isGradingStage.value || isPassedStage.value)

const trainingTitle = computed(() => {
  if (stage.value === 'advancedEnterMode') return `${textShortcutText.value}：进入操作模式`
  if (stage.value === 'advancedTryL') return 'L：逐字输入模式'
  if (stage.value === 'advancedTryJ') return 'J：自动输入模式'
  if (stage.value === 'advancedTryExit') return `${textShortcutText.value}：退出操作模式`
  return 'K：重新再来'
})

const trainingDescription = computed(() => {
  if (stage.value === 'advancedEnterMode') return `按 ${textShortcutText.value} 进入模拟输入操作模式。检测到进入后会自动进入下一步。`
  if (stage.value === 'advancedTryL') return '请先使用模拟输入快捷键进入操作模式，然后多次按 L。L 会每次输出一个字符，这就是逐字输入模式。'
  if (stage.value === 'advancedTryJ') return '请按 J 体验自动输入模式。再次按 J 可以暂停或继续。平常开启快速输入时，进入操作模式会自动触发 J，所以看起来会直接开始输入。'
  if (stage.value === 'advancedTryExit') return `请再次按 ${textShortcutText.value} 退出模拟输入操作模式。`
  return '请再次进入操作模式后按 K。K 会退出并清空缓存，适合想重新开始、不继续输入的时候使用。'
})

const canManualAdvanceTraining = computed(() => !['advancedEnterMode', 'advancedTryExit'].includes(stage.value))

const trainingStatusText = computed(() => {
  if (stage.value === 'advancedEnterMode') return '等待进入'
  if (stage.value === 'advancedTryExit') return '等待退出'
  return '手动下一步'
})

const pickRandomTopic = () => {
  const topics = isAdvanced.value ? advancedTopics : basicTopics
  const index = Math.floor(Math.random() * topics.length)
  currentTopic.value = topics[index]
}

const clearRuntimeState = () => {
  questionText.value = ''
  practiceText.value = ''
  waitingQuestion.value = ''
  gradingResult.value = null
  confettiPieces.value = []
  if (confettiTimer) {
    clearTimeout(confettiTimer)
    confettiTimer = null
  }
}

const enterAdvancedTutorial = async () => {
  if (!shouldRestoreQuickInput && settings.quickInput) {
    shouldRestoreQuickInput = true
    settings.quickInput = false
    await setMg.save()
    advancedQuickInputNotice.value = true
  }
}

const restoreQuickInputIfNeeded = async () => {
  if (!shouldRestoreQuickInput) return

  shouldRestoreQuickInput = false
  advancedQuickInputNotice.value = false
  settings.quickInput = true
  await setMg.save()
}

const resetTutorial = async (focusInput = true) => {
  if (isAdvanced.value) {
    await enterAdvancedTutorial()
  }
  pickRandomTopic()
  stage.value = isAdvanced.value ? 'advancedInputting' : 'inputting'
  clearRuntimeState()

  await nextTick()
  if (focusInput) inputRef.value?.focus?.()
}

const switchTutorialMode = async (mode) => {
  if (mode === 'advanced' && !settings.tutorialBasicCompleted) {
    ElMessage.warning('完成基础教程后解锁进阶教程')
    return
  }

  if (tutorialMode.value === 'advanced' && mode !== 'advanced') {
    await restoreQuickInputIfNeeded()
  }

  tutorialMode.value = mode
  await resetTutorial()
}

const handleLeaveTutorial = async () => {
  await restoreQuickInputIfNeeded()
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
  if (!['inputting', 'advancedInputting'].includes(stage.value)) return
  if (!isQuestionReady.value) return

  const normalizedQuestion = questionText.value.trim()
  const selectedText = getSelectedInputText(event.target).trim()

  // 复制和剪切都会写入剪贴板，选中内容就是后续 AI 处理需要匹配的问题。
  if (!selectedText || selectedText !== normalizedQuestion) {
    ElMessage.warning('请选中并复制完整问题再继续')
    return
  }

  waitingQuestion.value = normalizedQuestion
  stage.value = isAdvanced.value ? 'advancedWaiting' : 'waiting'
}

const handleAiCompleted = (payload = {}) => {
  if (!['waiting', 'advancedWaiting'].includes(stage.value)) return
  if (payload.question?.trim() !== waitingQuestion.value) return

  if (isAdvanced.value) {
    stage.value = 'advancedEnterMode'
    questionText.value = ''
    gradingResult.value = null
    nextTick(() => practiceInputRef.value?.focus?.())
    return
  }

  stage.value = 'answering'
  questionText.value = ''
  gradingResult.value = null
  nextTick(() => inputRef.value?.focus?.())
}

const goNextTrainingStep = async () => {
  const nextMap = {
    advancedTryL: 'advancedTryJ',
    advancedTryJ: 'advancedTryExit',
    advancedTryExit: 'advancedTryRestart',
    advancedTryRestart: 'advancedAnswering'
  }

  stage.value = nextMap[stage.value] || 'advancedAnswering'
  if (stage.value === 'advancedAnswering') {
    questionText.value = ''
    practiceText.value = ''
    await nextTick()
    inputRef.value?.focus?.()
    return
  }

  await nextTick()
  practiceInputRef.value?.focus?.()
}

const handleTypingModeChanged = async (payload = {}) => {
  if (!isAdvanced.value) return

  if (stage.value === 'advancedEnterMode' && payload.inputMode) {
    stage.value = 'advancedTryL'
    await nextTick()
    practiceInputRef.value?.focus?.()
    return
  }

  if (stage.value === 'advancedTryExit' && !payload.inputMode) {
    stage.value = 'advancedTryRestart'
    await nextTick()
    practiceInputRef.value?.focus?.()
  }
}

const buildGradingQuestion = (answer) => JSON.stringify({
  tutorialType: isAdvanced.value ? 'advanced' : 'basic',
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
  if (!canSubmitAnswer.value) return

  stage.value = isAdvanced.value ? 'advancedGrading' : 'grading'

  const gradingPrompt = [
    '你是大学入门教程的评分老师。',
    '请根据教程类型、题目、用户向 AI 提出的问题、用户最终写下的答案评分。',
    '基础教程评分标准：0 到 100 分，答案大致正确、表达清楚即可给 60 分以上；明显无关或过短应低分。',
    '进阶教程评分标准：答案必须不少于 500 字，内容贴合作文题，有基本结构和观点；明显跑题或字数不足应低分。',
    '只返回 JSON，不要 Markdown，不要额外文字。',
    'JSON 格式：{"score":数字,"comment":"中文简短评语","passed":布尔值}',
    '注意：passed 必须等于 score > 60。'
  ].join('\n')

  const rawResult = await aiMg.askAi(buildGradingQuestion(answer), gradingPrompt, false)
  const result = parseGradingResult(rawResult)

  if (!result) {
    stage.value = isAdvanced.value ? 'advancedFailed' : 'failed'
    ElMessage.error('AI 评分失败，请稍后重试')
    return
  }

  gradingResult.value = result
  if (result.passed) {
    stage.value = isAdvanced.value ? 'advancedPassed' : 'passed'
    if (!isAdvanced.value && !settings.tutorialBasicCompleted) {
      settings.tutorialBasicCompleted = true
      await setMg.save()
    }
    launchConfetti()
    return
  }

  stage.value = isAdvanced.value ? 'advancedFailed' : 'failed'
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
  unsubscribeTypingModeChanged = mitt.on('typing-mode-changed', handleTypingModeChanged)
})

onUnmounted(() => {
  unsubscribeAiCompleted?.()
  unsubscribeTypingModeChanged?.()
  if (confettiTimer) clearTimeout(confettiTimer)
})

defineExpose({
  resetTutorial,
  handleLeaveTutorial
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

.stage-meter {
  display: flex;
  gap: 8px;
  flex: 0 0 auto;
}

.stage-meter span {
  width: 34px;
  height: 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.1);
}

.stage-meter span.active {
  background: var(--ctm-control);
}

.tutorial-tabs {
  display: inline-flex;
  gap: 8px;
  align-self: flex-start;
  padding: 4px;
  border: 1px solid var(--ctm-border);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.64);
}

.tutorial-tabs button {
  min-height: 34px;
  padding: 0 14px;
  border: 0;
  border-radius: 9px;
  color: var(--ctm-text-soft);
  background: transparent;
  font-size: 13px;
  font-weight: 760;
  cursor: pointer;
}

.tutorial-tabs button.active {
  color: #ffffff;
  background: var(--ctm-control);
}

.tutorial-tabs button:disabled {
  color: var(--ctm-text-muted);
  cursor: not-allowed;
}

.tutorial-tabs small {
  margin-left: 6px;
  font-size: 11px;
  font-weight: 650;
}

.quick-input-note {
  padding: 12px 14px;
  border: 1px solid rgba(178, 106, 0, 0.18);
  border-radius: var(--ctm-radius-md);
  color: var(--ctm-text-soft);
  background: rgba(255, 250, 241, 0.76);
  font-size: 13px;
  font-weight: 680;
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

.practice-heading--target {
  margin-top: 14px;
}

.instruction-text {
  margin: 0 0 14px;
  padding: 12px 14px;
  border: 1px solid var(--ctm-border);
  border-radius: var(--ctm-radius-sm);
  color: var(--ctm-text-soft);
  background: rgba(255, 255, 255, 0.58);
  font-size: 14px;
  font-weight: 650;
  line-height: 1.6;
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

.practice-topic,
.training-card p {
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
}

.practice-topic {
  user-select: none;
  -webkit-user-select: none;
}

.training-card p {
  font-size: 15px;
  font-weight: 650;
}

.tutorial-input-shell {
  border-radius: var(--ctm-radius-md);
}

.input-card :deep(.el-textarea__inner) {
  min-height: 190px !important;
  padding: 16px;
  color: var(--ctm-text);
  background: rgba(255, 255, 255, 0.74);
  font-size: 15px;
  font-weight: 620;
  line-height: 1.65;
}

.training-card :deep(.el-textarea__inner) {
  min-height: 150px !important;
  padding: 16px;
  color: var(--ctm-text);
  background: rgba(255, 255, 255, 0.74);
  font-size: 15px;
  font-weight: 620;
  line-height: 1.65;
}

.submit-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 14px;
}

.answer-count {
  color: var(--ctm-warning);
  font-size: 12px;
  font-weight: 720;
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
