import {createApp} from "vue";
import App from "./App.vue";
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './assets/global.css'

import {TrayIcon} from '@tauri-apps/api/tray';
import {defaultWindowIcon} from '@tauri-apps/api/app';
import {Menu} from '@tauri-apps/api/menu';
import {getCurrentWindow} from '@tauri-apps/api/window';
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

(async () => {
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
        await TrayIcon.new(options);
        info('main.js: 托盘图标创建成功');
    } catch (e) {
        error(`main.js: 托盘图标创建失败: ${e}`);
    }
})()


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
