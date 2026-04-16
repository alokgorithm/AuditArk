#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // ── Resolve backend exe path ──
            use tauri::Manager;
            use std::process::{Command, Stdio};
            use std::sync::Mutex;
            use std::io::{BufRead, BufReader};

            let resource_dir = app
                .path()
                .resource_dir()
                .expect("failed to resolve resource dir");

            // Tauri encodes ../../ as _up_/_up_/ in bundled resources
            #[cfg(windows)]
            let backend_exe = resource_dir.join("_up_").join("_up_").join("backend").join("dist").join("backend").join("backend.exe");
            #[cfg(not(windows))]
            let backend_exe = resource_dir.join("_up_").join("_up_").join("backend").join("dist").join("backend").join("backend");

            // ── Portable data folder next to the app install ──
            let app_local = app
                .path()
                .app_local_data_dir()
                .expect("failed to resolve app local data dir");
            let data_dir = app_local.join("ReceiptProcessorData");
            std::fs::create_dir_all(&data_dir).ok();

            // ── Log file for backend output ──
            let log_dir = app_local.join("logs");
            std::fs::create_dir_all(&log_dir).ok();
            let log_file = log_dir.join("backend.log");

            if backend_exe.exists() {
                let mut cmd = Command::new(&backend_exe);
                cmd.env("RPP_DATA_DIR", data_dir.to_str().unwrap_or(""))
                   .env("RPP_PORT", "8741")
                   .stdout(Stdio::piped())
                   .stderr(Stdio::piped());

                // Hide the console window in release builds on Windows
                #[cfg(windows)]
                {
                    use std::os::windows::process::CommandExt;
                    const CREATE_NO_WINDOW: u32 = 0x08000000;
                    if !cfg!(debug_assertions) {
                        cmd.creation_flags(CREATE_NO_WINDOW);
                    }
                }

                match cmd.spawn() {
                    Ok(mut child) => {
                        // Capture stderr to log file so crashes are debuggable
                        let log_path = log_file.clone();
                        if let Some(stderr) = child.stderr.take() {
                            std::thread::spawn(move || {
                                let reader = BufReader::new(stderr);
                                let mut lines = Vec::new();
                                for line in reader.lines() {
                                    if let Ok(l) = line {
                                        eprintln!("[backend] {}", l);
                                        lines.push(l);
                                    }
                                }
                                // Write all captured output to log file
                                if !lines.is_empty() {
                                    let _ = std::fs::write(&log_path, lines.join("\n"));
                                }
                            });
                        }

                        struct BackendProcess(Mutex<std::process::Child>);
                        impl Drop for BackendProcess {
                            fn drop(&mut self) {
                                if let Ok(mut c) = self.0.lock() {
                                    let _ = c.kill();
                                    let _ = c.wait();
                                }
                            }
                        }

                        app.manage(BackendProcess(Mutex::new(child)));
                    }
                    Err(e) => {
                        let msg = format!("Failed to start backend: {}\nPath: {:?}", e, backend_exe);
                        eprintln!("{}", msg);
                        let _ = std::fs::write(&log_file, &msg);
                    }
                }
            } else {
                let msg = format!(
                    "Backend not found at {:?} — running in dev mode (start backend manually)",
                    backend_exe
                );
                eprintln!("{}", msg);
                let _ = std::fs::write(&log_file, &msg);
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
