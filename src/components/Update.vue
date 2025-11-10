<template>
    <el-dialog v-model="updateDialogVisible" title="发现新版本" width="500px" :close-on-click-modal="false"
        :show-close="false" align-center class="update-dialog">
        <div class="update-content">
            <!-- 顶部图标 -->
            <div class="update-icon">
                <el-icon :size="60" color="#409EFF">
                    <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                        <path fill="currentColor"
                            d="M512 64a448 448 0 1 1 0 896 448 448 0 0 1 0-896zm0 832a384 384 0 0 0 0-768 384 384 0 0 0 0 768zm48-176a48 48 0 1 1-96 0 48 48 0 0 1 96 0zm-48-464c-26.5 0-48 21.5-48 48v288c0 26.5 21.5 48 48 48s48-21.5 48-48V304c0-26.5-21.5-48-48-48z" />
                    </svg>
                </el-icon>
            </div>

            <!-- 版本信息 -->
            <div v-if="updateInfo" class="version-info">
                <h3 class="version-title">
                    版本 <span class="version-number">{{ updateInfo.version }}</span> 已发布
                </h3>
                <div class="version-date">
                    <el-icon>
                        <Clock />
                    </el-icon>
                    <span>{{ formatDate(updateInfo.date) }}</span>
                </div>
            </div>

            <!-- 更新说明 -->
            <div v-if="updateInfo && updateInfo.body" class="release-notes">
                <h4 class="notes-title">更新内容</h4>
                <div class="notes-content">
                    <div v-html="formatReleaseNotes(updateInfo.body)"></div>
                </div>
            </div>

            <!-- 下载进度 -->
            <div v-if="downloading" class="download-progress">
                <div class="progress-info">
                    <span class="progress-label">{{ downloadStatus }}</span>
                    <span class="progress-size">{{ formatSize(downloaded) }} / {{ formatSize(contentLength) }}</span>
                </div>
                <el-progress :percentage="downloadPercentage" :color="progressColors" :stroke-width="12"
                    :show-text="false" />
            </div>

            <!-- 安装中提示 -->
            <div v-if="installing" class="installing-hint">
                <el-icon class="is-loading" :size="20">
                    <Loading />
                </el-icon>
                <span>正在安装更新...</span>
            </div>
        </div>

        <template #footer>
            <div class="dialog-footer">
                <el-button @click="skipVersion" :disabled="downloading || installing">
                    跳过此版本
                </el-button>
                <el-button @click="remindLater" :disabled="downloading || installing">
                    稍后提醒
                </el-button>
                <el-button type="primary" @click="startUpdate" :loading="downloading || installing"
                    :disabled="downloading || installing">
                    {{ downloading ? '下载中...' : installing ? '安装中...' : '立即更新' }}
                </el-button>
            </div>
        </template>
    </el-dialog>
</template>

<script setup>
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { onMounted, ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Clock, Loading } from '@element-plus/icons-vue'
import { marked } from 'marked'

// 配置 marked
marked.setOptions({
    breaks: true,        // 支持 GitHub 风格的换行
    gfm: true,           // 启用 GitHub Flavored Markdown
    headerIds: false,    // 不生成标题 ID
    mangle: false        // 不混淆邮箱地址
})

const updateDialogVisible = ref(false)
const updateInfo = ref(null)
const downloading = ref(false)
const installing = ref(false)
const downloaded = ref(0)
const contentLength = ref(0)
const downloadStatus = ref('准备下载...')
const skippedVersions = ref(new Set())
let rawUpdate = null

// 计算下载百分比
const downloadPercentage = computed(() => {
    if (contentLength.value === 0) return 0
    return Math.round((downloaded.value / contentLength.value) * 100)
})

// 进度条颜色
const progressColors = [
    { color: '#f56c6c', percentage: 20 },
    { color: '#e6a23c', percentage: 40 },
    { color: '#5cb87a', percentage: 60 },
    { color: '#1989fa', percentage: 80 },
    { color: '#409EFF', percentage: 100 }
]

// 格式化日期
const formatDate = (dateString) => {
    if (!dateString) return '未知日期'
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
}

// 格式化文件大小
const formatSize = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

// 格式化更新说明 - 使用 marked 库
const formatReleaseNotes = (notes) => {
    if (!notes) return ''
    try {
        // 使用 marked 将 Markdown 转换为 HTML
        return marked.parse(notes)
    } catch (error) {
        console.error('解析 Markdown 失败:', error)
        // 如果解析失败,返回原始文本
        return `<p>${notes}</p>`
    }
}

// 检查更新
const checkUpdate = async () => {
    try {
        const update = await check()
        console.log(update);

        if (update) {
            // 检查是否跳过了此版本
            if (skippedVersions.value.has(update.version)) {
                console.log(`版本 ${update.version} 已被跳过`)
                return
            }
            updateInfo.value = update
            rawUpdate = update
            updateDialogVisible.value = true
            console.log(`发现新版本: ${update.version}`)
            console.log(`发布日期: ${update.date}`)
            console.log(`更新说明: ${update.body}`)
        }
    } catch (error) {
        console.error('检查更新失败:', error)
    }
}

// 开始更新
const startUpdate = async () => {
    if (!rawUpdate) return

    try {
        downloading.value = true
        downloaded.value = 0
        contentLength.value = 0
        console.log("updataInfo.value");
        console.log(updateInfo.value);
        console.log(rawUpdate);


        await rawUpdate.downloadAndInstall((event) => {
            switch (event.event) {
                case 'Started':
                    contentLength.value = event.data.contentLength
                    downloadStatus.value = '正在下载...'
                    console.log(`开始下载 ${formatSize(event.data.contentLength)}`)
                    break
                case 'Progress':
                    downloaded.value += event.data.chunkLength
                    downloadStatus.value = '正在下载...'
                    // console.log(`已下载: ${formatSize(downloaded.value)} / ${formatSize(contentLength.value)}`)
                    break
                case 'Finished':
                    downloadStatus.value = '下载完成'
                    downloading.value = false
                    installing.value = true
                    console.log('下载完成,开始安装...')
                    break
            }
        })

        console.log('更新安装完成')
        ElMessage.success('更新安装完成,正在重启应用...')

        // 延迟一秒后重启,让用户看到成功提示
        setTimeout(async () => {
            await relaunch()
        }, 1000)
    } catch (error) {
        console.error('更新失败:', error)
        ElMessage.error('更新失败: ' + error.message)
        downloading.value = false
        installing.value = false
    }
}

// 跳过此版本
const skipVersion = () => {
    if (updateInfo.value) {
        skippedVersions.value.add(updateInfo.value.version)
        ElMessage.info(`已跳过版本 ${updateInfo.value.version}`)
        console.log(`跳过版本: ${updateInfo.value.version}`)
    }
    updateDialogVisible.value = false
}

// 稍后提醒
const remindLater = () => {
    ElMessage.info('下次启动时将继续提醒更新')
    updateDialogVisible.value = false
}

onMounted(() => {
    checkUpdate()
})
</script>

<style scoped>
.update-dialog :deep(.el-dialog) {
    border-radius: 16px;
    overflow: hidden;
}

.update-dialog :deep(.el-dialog__header) {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px 24px;
    margin: 0;
}

.update-dialog :deep(.el-dialog__title) {
    color: white;
    font-size: 18px;
    font-weight: 600;
}

.update-dialog :deep(.el-dialog__body) {
    padding: 24px;
}

.update-dialog :deep(.el-dialog__footer) {
    padding: 16px 24px;
    border-top: 1px solid #f0f0f0;
}

.update-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.update-icon {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 10px 0;
    animation: bounceIn 0.6s ease-out;
}

@keyframes bounceIn {
    0% {
        opacity: 0;
        transform: scale(0.3);
    }

    50% {
        opacity: 1;
        transform: scale(1.05);
    }

    70% {
        transform: scale(0.9);
    }

    100% {
        transform: scale(1);
    }
}

.version-info {
    text-align: center;
}

.version-title {
    margin: 0 0 8px 0;
    font-size: 20px;
    font-weight: 600;
    color: #303133;
}

.version-number {
    color: #409EFF;
    font-weight: 700;
}

.version-date {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 14px;
    color: #909399;
}

.release-notes {
    background: #f5f7fa;
    border-radius: 12px;
    padding: 16px;
    max-height: 300px;
    overflow-y: auto;
}

.notes-title {
    margin: 0 0 12px 0;
    font-size: 15px;
    font-weight: 600;
    color: #303133;
    padding-bottom: 8px;
    border-bottom: 2px solid #409EFF;
}

.notes-content {
    font-size: 14px;
    line-height: 1.8;
    color: #606266;
}

/* Markdown 标题样式 */
.notes-content :deep(h1),
.notes-content :deep(h2),
.notes-content :deep(h3),
.notes-content :deep(h4),
.notes-content :deep(h5),
.notes-content :deep(h6) {
    margin: 16px 0 8px 0;
    color: #303133;
    font-weight: 600;
    line-height: 1.4;
}

.notes-content :deep(h1) {
    font-size: 18px;
    border-bottom: 2px solid #e1e4e8;
    padding-bottom: 6px;
}

.notes-content :deep(h2) {
    font-size: 17px;
    border-bottom: 1px solid #e1e4e8;
    padding-bottom: 4px;
}

.notes-content :deep(h3) {
    font-size: 16px;
}

.notes-content :deep(h4) {
    font-size: 15px;
}

.notes-content :deep(h5),
.notes-content :deep(h6) {
    font-size: 14px;
}

/* 段落样式 */
.notes-content :deep(p) {
    margin: 8px 0;
}

.notes-content :deep(p:first-child) {
    margin-top: 0;
}

.notes-content :deep(p:last-child) {
    margin-bottom: 0;
}

/* 列表样式 */
.notes-content :deep(ul),
.notes-content :deep(ol) {
    margin: 8px 0;
    padding-left: 24px;
}

.notes-content :deep(li) {
    margin: 4px 0;
}

.notes-content :deep(ul) {
    list-style-type: disc;
}

.notes-content :deep(ol) {
    list-style-type: decimal;
}

.notes-content :deep(ul ul),
.notes-content :deep(ol ul) {
    list-style-type: circle;
}

.notes-content :deep(ul ul ul),
.notes-content :deep(ol ul ul) {
    list-style-type: square;
}

/* 代码样式 */
.notes-content :deep(code) {
    background-color: rgba(175, 184, 193, 0.2);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 13px;
    color: #e83e8c;
}

.notes-content :deep(pre) {
    background-color: #f6f8fa;
    border-radius: 6px;
    padding: 12px;
    overflow-x: auto;
    margin: 12px 0;
}

.notes-content :deep(pre code) {
    background-color: transparent;
    padding: 0;
    color: #24292e;
    font-size: 13px;
}

/* 引用样式 */
.notes-content :deep(blockquote) {
    margin: 12px 0;
    padding: 8px 16px;
    border-left: 4px solid #409EFF;
    background-color: rgba(64, 158, 255, 0.05);
    color: #606266;
}

.notes-content :deep(blockquote p) {
    margin: 4px 0;
}

/* 链接样式 */
.notes-content :deep(a) {
    color: #409EFF;
    text-decoration: none;
    transition: color 0.2s;
}

.notes-content :deep(a:hover) {
    color: #66b1ff;
    text-decoration: underline;
}

/* 分割线样式 */
.notes-content :deep(hr) {
    margin: 16px 0;
    border: none;
    border-top: 1px solid #e1e4e8;
}

/* 表格样式 */
.notes-content :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
}

.notes-content :deep(table th),
.notes-content :deep(table td) {
    padding: 8px 12px;
    border: 1px solid #e1e4e8;
    text-align: left;
}

.notes-content :deep(table th) {
    background-color: #f6f8fa;
    font-weight: 600;
    color: #303133;
}

.notes-content :deep(table tr:nth-child(even)) {
    background-color: #fafbfc;
}

/* 强调样式 */
.notes-content :deep(strong) {
    font-weight: 600;
    color: #303133;
}

.notes-content :deep(em) {
    font-style: italic;
}

/* 删除线 */
.notes-content :deep(del) {
    text-decoration: line-through;
    opacity: 0.7;
}

.download-progress {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.progress-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    color: #606266;
}

.progress-label {
    font-weight: 500;
}

.progress-size {
    color: #909399;
    font-family: 'Consolas', 'Monaco', monospace;
}

.installing-hint {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
    border-radius: 8px;
    color: #409EFF;
    font-weight: 500;
}

.dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
}

/* 滚动条样式 */
.release-notes::-webkit-scrollbar {
    width: 6px;
}

.release-notes::-webkit-scrollbar-track {
    background: #e9ecef;
    border-radius: 3px;
}

.release-notes::-webkit-scrollbar-thumb {
    background: #cbd5e0;
    border-radius: 3px;
}

.release-notes::-webkit-scrollbar-thumb:hover {
    background: #a0aec0;
}

/* 响应式设计 */
@media (max-width: 768px) {
    .update-dialog {
        width: 90% !important;
    }

    .version-title {
        font-size: 18px;
    }

    .release-notes {
        max-height: 200px;
    }

    .dialog-footer {
        flex-direction: column;
    }

    .dialog-footer .el-button {
        width: 100%;
    }
}
</style>