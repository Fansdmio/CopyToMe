<template>
    <el-dialog v-model="updateDialogVisible" title="发现新版本" width="500px" :close-on-click-modal="false"
        :show-close="false" align-center class="update-dialog">
        <div class="update-content">
            <!-- 顶部图标 -->
            <div class="update-icon">
                <img src="../assets/logo.png" style="width: 50px;" alt="Update Icon" />
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
                <el-progress :percentage="downloadPercentage" :color="progressColors" :stroke-width="8"
                    :show-text="false" class="custom-progress" />
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
import mitt from '../utils/mitt.js'
import setMg from '../composables/setMg'
import { info } from '@tauri-apps/plugin-log'

const { settings } = setMg
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
let rawUpdate = null

// 计算下载百分比
const downloadPercentage = computed(() => {
    if (contentLength.value === 0) return 0
    return Math.round((downloaded.value / contentLength.value) * 100)
})

// 进度条颜色 - 平滑的渐变色系
const progressColors = [
    { color: '#409EFF', percentage: 20 },
    { color: '#66b1ff', percentage: 40 },
    { color: '#5bacf5', percentage: 60 },
    { color: '#3aa1f5', percentage: 80 },
    { color: '#1890ff', percentage: 100 }
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
const checkUpdate = async (disSkipVersion) => {
    try {
        const update = await check()
        console.log(update);

        if (!update) {
            if (disSkipVersion) {
                ElMessage.primary('当前已是最新版本')
            }
            return
        }

        disSkipVersion && info("不跳过版本检查,强制提示更新");
        // 检查是否跳过了此版本
        if (!disSkipVersion && settings.skippedVersions.includes(update.version)) {
            console.log(`版本 ${update.version} 已被跳过`)
            return
        }
        updateInfo.value = update
        rawUpdate = update
        updateDialogVisible.value = true
        console.log(`发现新版本: ${update.version}`)
        console.log(`发布日期: ${update.date}`)
        console.log(`更新说明: ${update.body}`)
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
        console.log("updateInfo.value");
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
        //添加到跳过列表
        settings.skippedVersions.push(updateInfo.value.version)
        ElMessage.info(`已跳过版本 ${updateInfo.value.version}`)
        console.log(`跳过版本: ${updateInfo.value.version}`)
    }
    updateDialogVisible.value = false
    //保存设置
    setMg.save()
}

// 稍后提醒
const remindLater = () => {
    ElMessage.info('下次启动时将继续提醒更新')
    updateDialogVisible.value = false
}

onMounted(() => {
    //订阅更新事件
    mitt.on('check-update', checkUpdate)
})
</script>

<style scoped>
.update-dialog :deep(.el-dialog) {
    border-radius: 16px;
    overflow: hidden;
}

.update-dialog :deep(.el-dialog__header) {
    background: linear-gradient(135deg, #409EFF 0%, #1989fa 100%);
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
    margin: 0 0 16px 0;
    font-size: 15px;
    font-weight: 600;
    color: #303133;
    position: relative;
    padding-left: 12px;
}

.notes-title::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 4px;
    height: 18px;
    background: linear-gradient(180deg, #409EFF 0%, #66b1ff 100%);
    border-radius: 2px;
    box-shadow: 0 0 8px rgba(64, 158, 255, 0.4);
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
    padding-left: 12px;
    position: relative;
    margin-bottom: 12px;
}

.notes-content :deep(h1)::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 4px;
    height: 20px;
    background: linear-gradient(180deg, #409EFF 0%, #66b1ff 100%);
    border-radius: 2px;
    box-shadow: 0 0 8px rgba(64, 158, 255, 0.4);
}

.notes-content :deep(h2) {
    font-size: 17px;
    padding-left: 10px;
    position: relative;
    margin-bottom: 10px;
}

.notes-content :deep(h2)::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 16px;
    background: linear-gradient(180deg, #66b1ff 0%, #a0cfff 100%);
    border-radius: 2px;
    box-shadow: 0 0 6px rgba(102, 177, 255, 0.4);
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
    margin: 12px 0;
    padding-left: 0;
    list-style: none;
}

.notes-content :deep(li) {
    position: relative;
    margin: 8px 0;
    padding-left: 28px;
    line-height: 1.8;
    transition: all 0.2s ease;
}

.notes-content :deep(li:hover) {
    transform: translateX(2px);
}

/* 一级列表 - 使用现代化的图标 */
.notes-content :deep(ul > li)::before {
    content: '';
    position: absolute;
    left: 0;
    top: 10px;
    width: 6px;
    height: 6px;
    background: linear-gradient(135deg, #409EFF 0%, #66b1ff 100%);
    border-radius: 50%;
    box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.15);
    transition: all 0.3s ease;
}

.notes-content :deep(ul > li:hover)::before {
    transform: scale(1.3);
    box-shadow: 0 0 0 5px rgba(64, 158, 255, 0.25);
}

/* 数字列表样式 */
.notes-content :deep(ol) {
    counter-reset: custom-counter;
}

.notes-content :deep(ol > li) {
    counter-increment: custom-counter;
}

.notes-content :deep(ol > li)::before {
    content: counter(custom-counter);
    position: absolute;
    left: 0;
    top: 2px;
    width: 20px;
    height: 20px;
    background: linear-gradient(135deg, #409EFF 0%, #66b1ff 100%);
    color: white;
    border-radius: 50%;
    font-size: 11px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(64, 158, 255, 0.3);
    transition: all 0.3s ease;
}

.notes-content :deep(ol > li:hover)::before {
    transform: scale(1.15);
    box-shadow: 0 3px 8px rgba(64, 158, 255, 0.4);
}

/* 二级列表 */
.notes-content :deep(ul ul > li)::before {
    background: linear-gradient(135deg, #66b1ff 0%, #a0cfff 100%);
    box-shadow: 0 0 0 3px rgba(102, 177, 255, 0.15);
    width: 5px;
    height: 5px;
}

.notes-content :deep(ol ol > li)::before {
    background: linear-gradient(135deg, #66b1ff 0%, #a0cfff 100%);
}

/* 三级列表 */
.notes-content :deep(ul ul ul > li)::before {
    background: linear-gradient(135deg, #a0cfff 0%, #d9ecff 100%);
    box-shadow: 0 0 0 3px rgba(160, 207, 255, 0.15);
    width: 4px;
    height: 4px;
}

.notes-content :deep(ol ol ol > li)::before {
    background: linear-gradient(135deg, #a0cfff 0%, #d9ecff 100%);
}

/* 嵌套列表间距调整 */
.notes-content :deep(ul ul),
.notes-content :deep(ol ul),
.notes-content :deep(ul ol),
.notes-content :deep(ol ol) {
    margin: 6px 0;
    padding-left: 20px;
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
    gap: 12px;
    padding: 16px;
    background: linear-gradient(135deg, rgba(64, 158, 255, 0.05) 0%, rgba(102, 177, 255, 0.05) 100%);
    border-radius: 12px;
    border: 1px solid rgba(64, 158, 255, 0.1);
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

/* 自定义进度条样式 */
.custom-progress :deep(.el-progress-bar__outer) {
    background-color: rgba(64, 158, 255, 0.1);
    border-radius: 10px;
    overflow: hidden;
}

.custom-progress :deep(.el-progress-bar__inner) {
    border-radius: 10px;
    background: linear-gradient(90deg, #409EFF 0%, #66b1ff 50%, #409EFF 100%);
    background-size: 200% 100%;
    animation: progressShine 2s ease-in-out infinite;
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes progressShine {
    0% {
        background-position: 200% 0;
    }
    50% {
        background-position: 0% 0;
    }
    100% {
        background-position: -200% 0;
    }
}

.installing-hint {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    background: linear-gradient(135deg, rgba(64, 158, 255, 0.1) 0%, rgba(102, 177, 255, 0.1) 100%);
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