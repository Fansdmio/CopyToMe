export const formatShortcutForDisplay = (shortcut = '') => {
  // 内部仍使用 CmdOrControl 注册跨平台快捷键，界面展示统一写成用户更熟悉的 CTRL。
  return shortcut.replaceAll('CmdOrControl', 'CTRL')
}
