# DLL 注入功能升级说明

## 🔧 新的注入流程

由于一些目标程序的安装目录有严格的权限保护（即使使用管理员权限也无法直接复制文件），我们改进了 DLL 注入流程：

### 改进前的流程（可能失败）：
1. ❌ 直接复制 DLL 和配置文件到目标程序目录
2. ❌ 如果目标目录有权限限制，操作失败

### 改进后的流程（更可靠）：
1. ✅ 先将 DLL 和 `eat_rice.txt` 复制到应用程序数据目录
2. ✅ 尝试自动复制到目标程序目录
3. ✅ 如果自动复制失败（权限问题），弹出提示框引导用户手动复制
4. ✅ 点击确认后自动打开包含文件的文件夹

## 📁 文件位置

### 应用程序数据目录（临时文件）
```
Windows: C:\Users\[用户名]\AppData\Roaming\com.tauri.dev\inject_files\
```

这个目录包含：
- `winmm.dll`（或其他 DLL 文件）
- `eat_rice.txt`（包含 DeepSeek API）

### 目标程序目录
用户选择的目标程序所在的目录，例如：
```
D:\cxdownload\kehuduan\考试客户端_V4.1.4.25389(2022.11.22)\
```

## 🎯 用户操作步骤

### 如果自动复制成功：
- 显示：✅ "DLL 注入成功！"
- 无需其他操作

### 如果需要手动复制：
1. 会弹出提示框，说明需要手动复制
2. 点击"打开文件夹"按钮
3. 自动打开包含准备好的文件的文件夹
4. 复制以下两个文件：
   - `winmm.dll`（或其他 DLL 文件名）
   - `eat_rice.txt`
5. 粘贴到目标程序目录
6. 完成！

## 💡 技术细节

### 新增 Rust 命令

#### `create_directory`
```rust
#[tauri::command]
fn create_directory(path: String) -> Result<(), String>
```
创建目录（包括所有父目录）

#### `open_folder`
```rust
#[tauri::command]
fn open_folder(path: String) -> Result<(), String>
```
在文件管理器中打开指定文件夹
- Windows: 使用 `explorer`
- macOS: 使用 `open`
- Linux: 使用 `xdg-open`

### JavaScript 修改

```javascript
// 第一步：复制到应用程序目录（总是成功）
const appDir = await appDataDir()
const injectDir = await join(appDir, 'inject_files')
await copyFile(sourceDllPath, appDllPath)
await writeTextFile(appApiFilePath, settings.deepseekApi)

// 第二步：尝试自动复制到目标目录
try {
  await copyFile(appDllPath, targetDllPath)
  await copyFile(appApiFilePath, targetApiFilePath)
  // 成功
} catch (err) {
  // 失败则引导用户手动复制
  await ElMessageBox.alert(/* 提示信息 */)
  await invoke('open_folder', { path: injectDir })
}
```

## 🔍 日志跟踪

新流程会记录以下日志：
```
[INFO] Setting: 应用数据目录: C:\Users\...\inject_files
[INFO] Setting: DLL已复制到应用目录: ...
[INFO] Setting: API文件已创建到应用目录: ...
[INFO] Setting: 文件已自动复制到目标目录: ... (如果成功)
[ERROR] Setting: 自动复制失败: ... (如果失败)
[INFO] Setting: 提示用户手动复制文件
```

## ✅ 优势

1. **更可靠** - 不依赖目标目录的写入权限
2. **用户友好** - 自动打开文件夹，减少操作步骤
3. **保留文件** - 文件保存在应用数据目录，可以重复使用
4. **透明度高** - 通过日志清楚记录每一步操作
5. **兼容性好** - 支持 Windows/macOS/Linux

## 🚨 注意事项

1. 应用数据目录中的文件是准备注入的文件，可以删除
2. 如果修改了 DeepSeek API，需要重新点击"注入 DLL"按钮
3. 手动复制文件时，确保两个文件都复制到目标目录
