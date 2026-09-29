use tauri::{WebviewWindow, command};

#[command]
pub fn open_devtools(window: WebviewWindow) {
    let _ = window.open_devtools();
}
