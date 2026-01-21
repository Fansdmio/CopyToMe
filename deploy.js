import { execSync } from 'child_process';
import tauri_conf from "./src-tauri/tauri.conf.json" with { type: "json" };
import latest from "./latest.json" with { type: "json" };
import fs from 'fs';

const deploy_mode = process.argv[2] || 'web';
const version = tauri_conf.version;

const update_latest = () => {
    // 更新 latest.json 文件
    //更新基本信息
    latest.version = version;
    latest.platforms["windows-x86_64"].url = `https://cp.wojwo.xyz/download/CopyToMeAndTauri_${version}_x64-setup.exe`;
    //变成ISO格式的中国时间
    latest.pub_date = new Date().toISOString();
    //更新签名
    const signature = fs.readFileSync(`./src-tauri/target/release/bundle/nsis/CopyToMeAndTauri_${version}_x64-setup.exe.sig`, 'utf-8');
    latest.platforms["windows-x86_64"].signature = signature;
    //更新说明
    const update_md = fs.readFileSync(`./md/UPDATE_LATEST.md`, 'utf-8');
    latest.notes = update_md;

    // 写入 latest.json 文件
    fs.writeFileSync('./latest.json', JSON.stringify(latest, null, 2), 'utf-8');
    console.log("latest.json 文件已更新");

    //上传更新公告
    const update_cmd = `scp ./latest.json root@uuio:/usr/local/nginx/html/CopyToMeWeb/latest.json`;
    execSync(update_cmd, { stdio: 'inherit' });
    console.log("应用已发布更新公告");
}

// 部署应用程序到服务器
const deploy_app = () => {
    // 构建应用程序
    const build_cmd = `cargo tauri build`
    execSync(build_cmd, { stdio: 'inherit' });
    console.log("应用程序构建完成");

    // 上传安装程序文件到服务器
    const deploy_cmd = `scp ./src-tauri/target/release/bundle/nsis/CopyToMeAndTauri_${version}_x64-setup.exe root@uuio:/usr/local/nginx/html/CopyToMeWeb/download/`;
    execSync(deploy_cmd, { stdio: 'inherit' });
    console.log("应用已经部署到服务器");

    // 更新 latest.json 文件并上传
    update_latest();
}

const deploy_web = () => {
    const deploy_cmd = `scp ./website/website.html root@uuio:/usr/local/nginx/html/CopyToMeWeb/and_tauri/index.html`;
    execSync(deploy_cmd, { stdio: 'inherit' });
    console.log("CopyToMeAndTauri网站页面已更新");
}

const deploy_dumpweb = () => {
    const deploy_cmd = `scp ./website/website.dump.html root@uuio:/usr/local/nginx/html/CopyToMeWeb/index.html`;
    execSync(deploy_cmd, { stdio: 'inherit' });
    console.log("CopyToMeAndRust网站页面已更新");
}
const deploy_guideweb = () => {
    const deploy_cmd = `scp ./website/website.guide.html root@uuio:/usr/local/nginx/html/CopyToMeWeb/and_tauri/guide/index.html`;
    execSync(deploy_cmd, { stdio: 'inherit' });
    console.log("指导网站页面已更新");
}
switch (deploy_mode) {
    case 'app':
        deploy_app();
        break;
    case 'web':
        deploy_web();
        break;
    case 'dumpweb':
        deploy_dumpweb();
        break;
    case "guide":
        deploy_guideweb();
        break;
    case 'md':
        update_latest();
        break;
    case 'all':
        deploy_app();
        deploy_web();
        deploy_guideweb();
        deploy_dumpweb();
        break;
    default:
        console.log(`未知的部署模式: ${deploy_mode}`);
}