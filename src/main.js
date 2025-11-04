import {createApp} from "vue";
import App from "./App.vue";
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './assets/global.css'

import {TrayIcon} from '@tauri-apps/api/tray';
import {defaultWindowIcon} from '@tauri-apps/api/app';
import {Menu} from '@tauri-apps/api/menu';
import {getCurrentWindow} from '@tauri-apps/api/window';


(async () => {
    const appWindow = getCurrentWindow();
    const exitApp = async () => {
        await appWindow.close();
    }

    const showWindow = async () => {
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
})()


const app = createApp(App)


app.use(ElementPlus)
app.mount('#app')
