use enigo::{Enigo, Keyboard, Settings};
use rand::Rng;
use std::sync::{atomic::AtomicBool, atomic::Ordering, Arc, LazyLock, Mutex};
use std::thread::{self, sleep};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use std::fs;
static L_TIEM: LazyLock<Mutex<u64>> = LazyLock::new(|| Mutex::new(1));
static R_TIEM: LazyLock<Mutex<u64>> = LazyLock::new(|| Mutex::new(5));
static STOP_FLAG: LazyLock<Arc<AtomicBool>> = LazyLock::new(|| Arc::new(AtomicBool::new(false)));
use tauri_plugin_log::{Target, TargetKind};

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
fn handle_text(app: AppHandle, text: String) {
    // 重置停止标志
    STOP_FLAG.store(false, Ordering::Relaxed);

    let stop_flag = Arc::clone(&STOP_FLAG);
    // 在新线程中执行,避免阻塞主线程
    thread::spawn(move || {
        let l_val = *L_TIEM.lock().expect("");
        let r_val = *R_TIEM.lock().expect("");
        let mut rng = rand::rng();
        let mut enigo = Enigo::new(&Settings::default()).expect("初始化enigo失败");
        for c in text.chars() {
            // 检查停止标志
            if stop_flag.load(Ordering::Relaxed) {
                println!("检测到停止信号,中断输入");
                break;
            }

            if let Err(e) = enigo.text(&c.to_string()) {
                eprintln!("输入字符失败: {}", e);
                break;
            }
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
                    println!("延迟期间检测到停止信号,中断输入");
                    return;
                }

                let sleep_time = remaining.min(check_interval);
                sleep(Duration::from_millis(sleep_time));
                remaining = remaining.saturating_sub(sleep_time);
            }
        }
        let _ = app.emit("text_handled", "");
        println!("文本输入完成或已中断");
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
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
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
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
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {}))
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
            open_folder
        ]);
    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
