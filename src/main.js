import { createApp } from "vue";
import App from "./App.vue";
import ElementPlus, { ElMessage, ElMessageBox } from 'element-plus'
import 'element-plus/dist/index.css'
import './assets/global.css'

import { TrayIcon } from '@tauri-apps/api/tray';
import { defaultWindowIcon } from '@tauri-apps/api/app';
import { Menu } from '@tauri-apps/api/menu';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { info, error } from '@tauri-apps/plugin-log';
import setMg from './composables/setMg.js';

info('main.js: 应用开始初始化');

// 统一 Element Plus 消息提示的默认行为，保持全应用右上角弹出、可手动关闭。
const setupMessageDefaults = () => {
    const normalizeOptions = (options = {}) => {
        const normalizedOptions = typeof options === 'string' ? { message: options } : { ...options };
        const classNames = ['ctm-message', normalizedOptions.customClass].filter(Boolean).join(' ');

        return {
            showClose: true,
            offset: 48,
            duration: 3200,
            ...normalizedOptions,
            customClass: classNames,
        };
    };

    const messageTypes = ['success', 'warning', 'info', 'error', 'primary'];

    messageTypes.forEach((type) => {
        const rawTypeMessage = ElMessage[type];

        if (typeof rawTypeMessage === 'function') {
            ElMessage[type] = (options) => rawTypeMessage(normalizeOptions(options));
        }
    });
}

setupMessageDefaults();

// 统一确认弹窗默认行为，关闭滚动锁定避免页面容器在弹出时横向抖动。
const setupMessageBoxDefaults = () => {
    const withStableLayout = (options = {}) => ({
        lockScroll: false,
        ...options,
    });
    const rawConfirm = ElMessageBox.confirm;

    ElMessageBox.confirm = (message, title, options) => rawConfirm(message, title, withStableLayout(options));
}

setupMessageBoxDefaults();

// 捕获未处理的错误
window.addEventListener('error', (event) => {
    error(`main.js: 全局错误 - ${event.error?.message || event.message}`);
    error(`main.js: 错误堆栈 - ${event.error?.stack || 'No stack'}`);
});

window.addEventListener('unhandledrejection', (event) => {
    error(`main.js: 未处理的Promise拒绝 - ${event.reason}`);
});

// 禁用浏览器默认快捷键
window.addEventListener('keydown', (event) => {
    // 禁用 Ctrl+R / Cmd+R (刷新)
    if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        event.preventDefault();
        info('main.js: 阻止刷新操作');
        return false;
    }
    
    // 禁用 Ctrl+P / Cmd+P (打印)
    if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
        event.preventDefault();
        info('main.js: 阻止打印操作');
        return false;
    }
    
    // 禁用 Ctrl+J / Cmd+J (下载历史)
    if ((event.ctrlKey || event.metaKey) && event.key === 'j') {
        event.preventDefault();
        info('main.js: 阻止浏览器下载历史');
        return false;
    }
    
    // 禁用 Ctrl+K / Cmd+K (浏览器搜索)
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        info('main.js: 阻止浏览器搜索');
        return false;
    }
    
    // 禁用 Ctrl+H / Cmd+H (浏览器历史记录)
    if ((event.ctrlKey || event.metaKey) && event.key === 'h') {
        event.preventDefault();
        info('main.js: 阻止浏览器历史记录');
        return false;
    }
    
    // 禁用 F5 (刷新)
    if (event.key === 'F5') {
        event.preventDefault();
        info('main.js: 阻止F5刷新');
        return false;
    }
    
    // 禁用 Ctrl+Shift+R / Cmd+Shift+R (强制刷新)
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'r') {
        event.preventDefault();
        info('main.js: 阻止强制刷新操作');
        return false;
    }
    
    // // 禁用 F12 (开发者工具) - 可选
    // if (event.key === 'F12') {
    //     event.preventDefault();
    //     info('main.js: 阻止开发者工具');
    //     return false;
    // }
    
    // 禁用 Ctrl+Shift+I / Cmd+Option+I (开发者工具)
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'i') {
        event.preventDefault();
        info('main.js: 阻止开发者工具');
        return false;
    }
    
    // 禁用 Ctrl+U / Cmd+U (查看源代码)
    if ((event.ctrlKey || event.metaKey) && event.key === 'u') {
        event.preventDefault();
        info('main.js: 阻止查看源代码');
        return false;
    }
}, true);

// 禁用右键菜单（可选）
window.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    return false;
});

// 全局托盘图标变量
let globalTrayIcon = null;

// 创建托盘图标
const createTrayIcon = async () => {
    info('main.js: 创建托盘图标');
    try {
        const appWindow = getCurrentWindow();
        const exitApp = async () => {
            info('main.js: 退出应用');
            await appWindow.close();
        }

        const showWindow = async () => {
            info('main.js: 显示窗口');
            await appWindow.show();
        }

        // 创建托盘菜单
        const menu = await Menu.new({
            items: [
                {
                    id: 'show',
                    text: '显示窗口',
                    action: showWindow
                },
                {
                    id: 'quit',
                    text: '退出',
                    action: exitApp
                },
            ],
        });
        const options = {
            menu,
            menuOnLeftClick: false,
            icon: await defaultWindowIcon(),
        };
        globalTrayIcon = await TrayIcon.new(options);
        info('main.js: 托盘图标创建成功');
        return globalTrayIcon;
    } catch (e) {
        error(`main.js: 托盘图标创建失败: ${e}`);
        return null;
    }
}

// 显示托盘图标
export const showTrayIcon = async () => {
    info('main.js: 显示托盘图标');
    if (!globalTrayIcon) {
        globalTrayIcon = await createTrayIcon();
    }
    return !!globalTrayIcon;
}

// 隐藏托盘图标
export const hideTrayIcon = async () => {
    info('main.js: 隐藏托盘图标');
    if (globalTrayIcon) {
        try {
            // 移除托盘图标
            await globalTrayIcon.close();
            globalTrayIcon = null;
            info('main.js: 托盘图标已隐藏');
            return true;
        } catch (e) {
            error(`main.js: 隐藏托盘图标失败: ${e}`);
            return false;
        }
    }
    return true;
}

// 切换托盘图标显示状态
export const toggleTrayIcon = async () => {
    info('main.js: 切换托盘图标显示状态');
    if (globalTrayIcon) {
        return await hideTrayIcon();
    } else {
        return await showTrayIcon();
    }
}

// 检查托盘图标是否显示
export const isTrayIconVisible = () => {
    return !!globalTrayIcon;
}

// 默认创建托盘图标（在 App.vue 中会根据设置决定是否隐藏）
createTrayIcon();


// 先初始化 store，确保子组件挂载时 store 已就绪
await setMg.init()
info('main.js: 设置管理器初始化完成');

const app = createApp(App)

info('main.js: 挂载Vue应用');
try {
    app.use(ElementPlus)
    app.mount('#app')
    info('main.js: Vue应用挂载完成');
} catch (e) {
    error(`main.js: Vue应用挂载失败: ${e}`);
    error(`main.js: 错误堆栈: ${e.stack}`);
}
