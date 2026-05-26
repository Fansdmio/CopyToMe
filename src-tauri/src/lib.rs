use enigo::{Enigo, Keyboard, Settings};
use rand::Rng;
use std::sync::{atomic::AtomicBool, atomic::Ordering, Arc, LazyLock, Mutex};
use std::thread::{self, sleep};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{Shortcut, GlobalShortcutExt, ShortcutState};
static L_TIEM: LazyLock<Mutex<u64>> = LazyLock::new(|| Mutex::new(1));
static R_TIEM: LazyLock<Mutex<u64>> = LazyLock::new(|| Mutex::new(5));
static STOP_FLAG: LazyLock<Arc<AtomicBool>> = LazyLock::new(|| Arc::new(AtomicBool::new(false)));
use tauri_plugin_log::{Target, TargetKind};

#[cfg(target_os = "windows")]
use windows::Win32::UI::WindowsAndMessaging::{LoadCursorW, SetSystemCursor, IDC_CROSS, OCR_NORMAL};

#[cfg(target_os = "windows")]
use windows::{
    core::PCWSTR,
    Win32::{
        System::Diagnostics::ToolHelp::{
            CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W,
            TH32CS_SNAPPROCESS,
        },
        UI::{
            Shell::{IsUserAnAdmin, ShellExecuteW},
            WindowsAndMessaging::SW_SHOWNORMAL,
        },
    },
};

#[tauri::command]
fn update_time_range(left: u64, right: u64) {
    let mut l_val = L_TIEM.lock().expect("");
    let mut r_val = R_TIEM.lock().expect("");
    *l_val = left;
    *r_val = right;
}

#[tauri::command]
fn stop_typing() {
    STOP_FLAG.store(true, Ordering::Relaxed);
    println!("设置停止标志");
}

#[cfg(target_os = "windows")]
fn to_wide_null(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(std::iter::once(0)).collect()
}

#[tauri::command]
fn is_running_as_admin() -> bool {
    #[cfg(target_os = "windows")]
    unsafe {
        return IsUserAnAdmin().as_bool();
    }

    #[cfg(not(target_os = "windows"))]
    {
        false
    }
}

#[tauri::command]
fn relaunch_as_admin() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let exe_path = std::env::current_exe()
            .map_err(|e| format!("获取当前程序路径失败: {}", e))?;
        let exe_path = exe_path
            .to_str()
            .ok_or_else(|| "当前程序路径包含无法处理的字符".to_string())?;

        let operation = to_wide_null("runas");
        let file = to_wide_null(exe_path);

        // 使用 Windows 的 runas 动词触发 UAC，成功拉起后退出当前非管理员进程。
        let result = unsafe {
            ShellExecuteW(
                None,
                PCWSTR(operation.as_ptr()),
                PCWSTR(file.as_ptr()),
                PCWSTR::null(),
                PCWSTR::null(),
                SW_SHOWNORMAL,
            )
        };

        if result.0 as isize <= 32 {
            return Err(format!("管理员重启失败,错误码: {}", result.0 as isize));
        }

        std::process::exit(0);
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("当前系统不支持管理员重启".to_string())
    }
}

#[tauri::command]
fn has_wetype_process() -> bool {
    #[cfg(target_os = "windows")]
    {
        let snapshot = match unsafe { CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) } {
            Ok(snapshot) => snapshot,
            Err(_) => return false,
        };

        let mut entry = PROCESSENTRY32W {
            dwSize: std::mem::size_of::<PROCESSENTRY32W>() as u32,
            ..Default::default()
        };

        // 启动时不能拉起 tasklist 这类控制台子进程，否则 GUI 会短暂卡住并可能闪出终端窗口。
        let mut has_process = unsafe { Process32FirstW(snapshot, &mut entry).is_ok() };
        while has_process {
            let name_end = entry
                .szExeFile
                .iter()
                .position(|c| *c == 0)
                .unwrap_or(entry.szExeFile.len());
            let process_name = String::from_utf16_lossy(&entry.szExeFile[..name_end]).to_lowercase();

            if process_name.contains("wetype")
                || process_name.contains("wechatinput")
                || process_name.contains("wechat input")
            {
                return true;
            }

            has_process = unsafe { Process32NextW(snapshot, &mut entry).is_ok() };
        }

        false
    }

    #[cfg(not(target_os = "windows"))]
    {
        false
    }
}

#[tauri::command]
fn handle_text(app: AppHandle, text: String, start_position: usize) {
    // 重置停止标志
    STOP_FLAG.store(false, Ordering::Relaxed);

    let stop_flag = Arc::clone(&STOP_FLAG);
    // 在新线程中执行,避免阻塞主线程
    thread::spawn(move || {
        let l_val = *L_TIEM.lock().expect("");
        let r_val = *R_TIEM.lock().expect("");
        let mut rng = rand::rng();
        let mut enigo = Enigo::new(&Settings::default()).expect("初始化enigo失败");
        
        let chars: Vec<char> = text.chars().collect();
        let mut current_pos = start_position;
        
        for (index, c) in chars.iter().enumerate().skip(start_position) {
            // 检查停止标志
            if stop_flag.load(Ordering::Relaxed) {
                println!("检测到停止信号,中断输入,当前位置: {}", current_pos);
                let _ = app.emit("text_paused", current_pos);
                return;
            }

            if let Err(e) = enigo.text(&c.to_string()) {
                eprintln!("输入字符失败: {}", e);
                let _ = app.emit("text_paused", current_pos);
                return;
            }
            
            current_pos = index + 1;
            
            // 在延迟期间也检查停止标志
            let mut delay = 0u64;
            if r_val == 0 && l_val == 0 {
                // 无延迟
            } else {
                delay = rng.random_range(l_val..r_val);
            }

            let check_interval = 10; // 每10ms检查一次
            let mut remaining = delay;

            while remaining > 0 {
                if stop_flag.load(Ordering::Relaxed) {
                    println!("延迟期间检测到停止信号,中断输入,当前位置: {}", current_pos);
                    let _ = app.emit("text_paused", current_pos);
                    return;
                }

                let sleep_time = remaining.min(check_interval);
                sleep(Duration::from_millis(sleep_time));
                remaining = remaining.saturating_sub(sleep_time);
            }
        }
        let _ = app.emit("text_handled", "");
        println!("文本输入完成,总字符数: {}", chars.len());
    });
}

#[tauri::command]
fn type_single_char(_app: AppHandle, text: String, position: usize) -> Result<usize, String> {
    let chars: Vec<char> = text.chars().collect();
    
    if position >= chars.len() {
        return Err("位置超出文本范围".to_string());
    }
    
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| e.to_string())?;
    let c = chars[position];
    
    enigo.text(&c.to_string()).map_err(|e| e.to_string())?;
    
    Ok(position + 1)
}

#[tauri::command]
fn register_shortcut(app: AppHandle, id: String, shortcut: String) -> Result<(), String> {
    let shortcut_obj: Shortcut = shortcut.parse().map_err(|e| format!("快捷键解析失败: {}", e))?;
    let id_clone = id.clone();
    
    app.global_shortcut()
        .on_shortcut(shortcut_obj, move |app, _shortcut, event| {
            // 只在按键按下时触发，避免释放时重复触发
            if event.state == ShortcutState::Pressed {
                let _ = app.emit(&format!("shortcut-{}", id_clone), ());
            }
        })
        .map_err(|e| format!("注册快捷键失败: {}", e))?;
    
    println!("成功注册快捷键: {} -> {}", id, shortcut);
    Ok(())
}

#[tauri::command]
fn unregister_shortcut(app: AppHandle, shortcut: String) -> Result<(), String> {
    let shortcut_obj: Shortcut = shortcut.parse().map_err(|e| format!("快捷键解析失败: {}", e))?;
    
    app.global_shortcut()
        .unregister(shortcut_obj)
        .map_err(|e| format!("注销快捷键失败: {}", e))?;
    
    println!("成功注销快捷键: {}", shortcut);
    Ok(())
}

#[tauri::command]
fn change_cursor_globally(duration_ms: u64) {
    #[cfg(target_os = "windows")]
    {
        use std::thread;
        use std::time::Duration;
        
        thread::spawn(move || {
            unsafe {
                // 加载十字准星光标
                if let Ok(cross_cursor) = LoadCursorW(None, IDC_CROSS) {
                    // 设置系统光标为十字准星
                    let _ = SetSystemCursor(cross_cursor, OCR_NORMAL);
                    println!("已将系统光标更改为十字准星");
                    
                    // 等待指定时间
                    thread::sleep(Duration::from_millis(duration_ms));
                    
                    // 恢复默认光标（重新加载并设置）
                    if let Ok(normal_cursor) = LoadCursorW(None, IDC_CROSS) {
                        let _ = SetSystemCursor(normal_cursor, OCR_NORMAL);
                    }
                    println!("已恢复默认系统光标");
                }
            }
        });
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        // 非Windows系统，静默忽略
        println!("当前系统不支持全局光标更改功能");
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(tauri_plugin_log::log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_store::Builder::new().build());

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                // 窗口可能按启动设置隐藏，再次启动时应恢复显示并聚焦。
                let _ = window.show();
                let _ = window.set_focus();
            }
        }));
    }

    builder = builder
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::LogDir { file_name: None }),
                    Target::new(TargetKind::Webview),
                ])
                .timezone_strategy(tauri_plugin_log::TimezoneStrategy::UseLocal)
                .build(),
        )
        .plugin(tauri_plugin_single_instance::init(|_, _, _| {}))
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            handle_text,
            update_time_range,
            stop_typing,
            type_single_char,
            register_shortcut,
            unregister_shortcut,
            change_cursor_globally,
            is_running_as_admin,
            relaunch_as_admin,
            has_wetype_process
        ]);
    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
