use enigo::{Enigo, Keyboard, Settings};
use rand::Rng;
use std::fs;
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

#[tauri::command]
fn create_directory(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn open_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
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
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build());

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = app
                .get_webview_window("main")
                .expect("no main window")
                .set_focus();
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
            create_directory,
            open_folder,
            type_single_char,
            register_shortcut,
            unregister_shortcut,
            change_cursor_globally
        ]);
    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
