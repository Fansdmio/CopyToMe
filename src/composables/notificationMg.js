import { ref, computed } from 'vue'
import setMg from './setMg'
import { satisfies } from 'compare-versions'

// 通知存储
const notifications = ref([])
const activeNotification = ref(null)

// 从本地加载已存储的通知
export const loadStoredNotifications = async () => {
    try {
        if (!setMg.store) {
            await setMg.init()
        }
        const stored = await setMg.store.get('stored_notifications')
        notifications.value = stored || []
    } catch (error) {
        console.error('加载本地通知失败:', error)
        notifications.value = []
    }
}

// 保存通知到本地
const saveNotification = async (notification) => {
    if (!notification.allowStorage) return

    // 检查是否已存在
    const exists = notifications.value.find(n => n.id === notification.id)
    if (!exists) {
        notifications.value.push({
            ...notification,
            receivedAt: new Date().toISOString()
        })
        if (!setMg.store) {
            await setMg.init()
        }
        await setMg.store.set('stored_notifications', notifications.value)
        await setMg.store.save()
    }
}

// 检查通知是否在有效期内
const isNotificationValid = (notification, currentVersion) => {
    const now = new Date()

    // 检查时间范围
    if (notification.timeRange) {
        if (notification.timeRange === "*") return true
        const start = new Date(notification.timeRange.start)
        const end = new Date(notification.timeRange.end)
        if (now < start || now > end) {
            return false
        }
    }

    // 检查版本范围
    if (notification.version) {
        if (notification.version === "*") return true
        try {
            if (!satisfies(currentVersion, notification.version)) {
                return false
            }
        } catch (error) {
            console.error('版本检查失败:', error)
            return false
        }
    }

    return true
}

// 从服务器获取通知
export const fetchNotifications = async () => {
    try {
        console.log('开始获取通知...')
        const response = await fetch('https://cp.uuyo.fun/notifications/notifications_dev.json')

        if (!response.ok) {
            console.error('通知服务器响应错误:', response.status)
            return []
        }

        const data = await response.json()
        console.log('获取到通知数据:', data)

        if (!data.notifications || !Array.isArray(data.notifications)) {
            console.error('通知数据格式错误')
            return []
        }

        // 获取当前应用版本
        const { getVersion } = await import('@tauri-apps/api/app')
        const currentVersion = await getVersion()
        console.log('当前应用版本:', currentVersion)

        // 过滤有效的通知
        const validNotifications = data.notifications.filter(n => {
            const isValid = isNotificationValid(n, currentVersion)
            console.log(`通知 ${n.id} 是否有效:`, isValid)
            return isValid
        })

        console.log('有效通知数量:', validNotifications.length)

        // 按优先级排序
        validNotifications.sort((a, b) => (a.priority || 99) - (b.priority || 99))

        return validNotifications
    } catch (error) {
        console.error('获取通知失败:', error)
        return []
    }
}

// 显示通知
export const showNotification = (notification) => {
    console.log('showNotification 被调用，通知ID:', notification?.id)
    console.log('设置 activeNotification.value 为:', notification)
    activeNotification.value = notification
    console.log('activeNotification.value 已设置为:', activeNotification.value)
}

// 关闭当前通知
export const closeNotification = () => {
    activeNotification.value = null
}

// 检查并显示未读通知
export const checkAndShowNotifications = async () => {
    console.log('开始检查并显示通知...')

    // 先加载本地已存储的通知
    await loadStoredNotifications()
    console.log('本地已存储的通知ID:', notifications.value.map(n => n.id))

    const validNotifications = await fetchNotifications()

    console.log('获取到有效通知:', validNotifications.length, validNotifications)

    // 过滤掉已经存储过的通知（已经弹出过的）
    const newNotifications = validNotifications.filter(n => {
        const isStored = notifications.value.some(stored => stored.id === n.id)
        if (isStored) {
            console.log(`通知 ${n.id} 已存储过，跳过显示`)
        }
        return !isStored
    })

    console.log('未显示过的新通知数量:', newNotifications.length)

    if (newNotifications.length > 0) {
        // 显示优先级最高的新通知
        const notificationToShow = newNotifications[0]
        console.log('准备显示通知:', notificationToShow.id)
        showNotification(notificationToShow)
        console.log('已调用 showNotification')

        // 显示后立即保存到本地，标记为已显示
        await saveNotification(notificationToShow)
        console.log('通知已保存到本地存储')
    } else {
        console.log('没有新通知需要显示')
    }
}


// 删除已存储的通知
export const deleteNotification = async (id) => {
    notifications.value = notifications.value.filter(n => n.id !== id)
    if (!setMg.store) {
        await setMg.init()
    }
    await setMg.store.set('stored_notifications', notifications.value)
    await setMg.store.save()
}

// 清空所有通知
export const clearAllNotifications = async () => {
    notifications.value = []
    if (!setMg.store) {
        await setMg.init()
    }
    await setMg.store.set('stored_notifications', [])
    await setMg.store.save()
}

// 导出状态
export const useNotifications = () => {
    return {
        notifications: computed(() => notifications.value),
        activeNotification: computed(() => activeNotification.value),
        loadStoredNotifications,
        fetchNotifications,
        showNotification,
        closeNotification,
        checkAndShowNotifications,
        deleteNotification,
        clearAllNotifications
    }
}

// 注入全局 API 供通知内容使用
if (typeof window !== 'undefined') {
    window.notificationAPI = {
        close: closeNotification,
        triggerAction: (actionName) => {
            console.log('触发动作:', actionName)
            // 可以根据 actionName 执行特定操作
        }
    }
}
