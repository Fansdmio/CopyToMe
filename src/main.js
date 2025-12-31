import { createApp } from "vue";
import App from "./App.vue";
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './assets/global.css'

import { TrayIcon } from '@tauri-apps/api/tray';
import { defaultWindowIcon } from '@tauri-apps/api/app';
import { Menu } from '@tauri-apps/api/menu';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { trace, info, error, attachConsole } from '@tauri-apps/plugin-log';

info('main.js: 应用开始初始化');

// 捕获未处理的错误
window.addEventListener('error', (event) => {
    error(`main.js: 全局错误 - ${event.error?.message || event.message}`);
    error(`main.js: 错误堆栈 - ${event.error?.stack || 'No stack'}`);
});

window.addEventListener('unhandledrejection', (event) => {
    error(`main.js: 未处理的Promise拒绝 - ${event.reason}`);
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

// 初始化托盘图标（可选）
export const initTrayIcon = async (autoHide = false) => {
    info(`main.js: 初始化托盘图标，自动隐藏: ${autoHide}`);
    if (!autoHide) {
        await createTrayIcon();
    } else {
        info('main.js: 自动隐藏托盘图标已启用，跳过初始化');
    }
}

// 默认创建托盘图标（在 App.vue 中会根据设置决定是否隐藏）
createTrayIcon();


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
