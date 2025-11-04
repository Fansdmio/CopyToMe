<template>
  <el-tag :type="enabled ? 'success' : 'info'" effect="dark">
    <el-icon>
      <component :is="enabled ? CircleCheck : CircleClose" />
    </el-icon>
    {{ enabled ? enabledText : disabledText }}
  </el-tag>
</template>

<script setup>
import { CircleCheck, CircleClose } from '@element-plus/icons-vue'

defineProps({
  enabled: {
    type: Boolean,
    required: true
  },
  enabledText: {
    type: String,
    default: '已启用'
  },
  disabledText: {
    type: String,
    default: '已禁用'
  }
})
</script>
