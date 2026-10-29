use serde::Deserialize;
use souvlaki::{
    MediaControlEvent, MediaControls, MediaMetadata, MediaPlayback, MediaPosition, PlatformConfig,
};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, State, command};

pub struct MediaControlManager {
    controls: MediaControls,
    attached: bool,
}

#[derive(Deserialize)]
pub struct Metadata<'a> {
    title: Option<&'a str>,
    artist: Option<&'a str>,
    album: Option<&'a str>,
    cover: Option<&'a str>,
    duration: Option<f64>,
}

impl MediaControlManager {
    pub fn new(app_handle: AppHandle) -> Result<Self, ()> {
        let _app_handle = app_handle.clone();
        #[cfg(not(target_os = "windows"))]
        let hwnd = None;

        #[cfg(target_os = "windows")]
        let hwnd = {
            use tauri::Manager;

            let hwnd = _app_handle
                .get_webview_window("main")
                .unwrap()
                .hwnd()
                .unwrap();
            Some(hwnd.0)
        };

        let config = PlatformConfig {
            dbus_name: "string_music",
            display_name: "String Music Player",
            hwnd,
        };

        let controls = match MediaControls::new(config) {
            Ok(controls) => controls,
            Err(e) => {
                log::error!("Failed to initialize media controls: {}", e);
                return Err(());
            }
        };

        Ok(Self {
            controls,
            attached: false,
        })
    }

    pub fn attach_media_control(&mut self, app_handle: AppHandle) {
        if self.attached {
            return;
        }

        let _ = self.controls.attach(move |event: MediaControlEvent| {
            match event {
                MediaControlEvent::Play => app_handle.emit("play", ()),
                MediaControlEvent::Pause => app_handle.emit("pause", ()),
                MediaControlEvent::Toggle => app_handle.emit("toggle", ()),
                MediaControlEvent::Next => app_handle.emit("next", ()),
                MediaControlEvent::Previous => app_handle.emit("previous", ()),
                MediaControlEvent::Stop => app_handle.emit("stop", ()),
                MediaControlEvent::Seek(direction) => app_handle.emit(
                    match direction {
                        souvlaki::SeekDirection::Forward => "seek-forward",
                        souvlaki::SeekDirection::Backward => "seek-backward",
                    },
                    (),
                ),
                MediaControlEvent::SeekBy(direction, duration) => app_handle.emit(
                    match direction {
                        souvlaki::SeekDirection::Forward => "seek-forward",
                        souvlaki::SeekDirection::Backward => "seek-backward",
                    },
                    duration.as_secs_f64(),
                ),
                MediaControlEvent::SetPosition(position) => {
                    app_handle.emit("set-position", position.0.as_secs_f64())
                }
                MediaControlEvent::SetVolume(volume) => app_handle.emit("set-volume", volume),
                MediaControlEvent::OpenUri(uri) => app_handle.emit("open-uri", uri),
                MediaControlEvent::Raise => app_handle.emit("raise", ()),
                MediaControlEvent::Quit => app_handle.emit("quit", ()),
            }
            .unwrap()
        });
        self.attached = true;
    }

    pub fn detach_media_control(&mut self) {
        if !self.attached {
            return;
        }
        let _ = self.controls.detach();
        self.attached = false;
    }

    pub fn set_metadata(&mut self, metadata: Metadata) {
        let _ = self.controls.set_metadata(MediaMetadata {
            title: metadata.title,
            album: metadata.album,
            artist: metadata.artist,
            cover_url: metadata.cover,
            duration: metadata.duration.map(Duration::from_secs_f64),
        });
    }

    pub fn set_playback(&mut self, paused: bool, position: f64) {
        let progress = Some(MediaPosition(Duration::from_secs_f64(position)));
        let _ = self.controls.set_playback(if paused {
            MediaPlayback::Paused { progress }
        } else {
            MediaPlayback::Playing { progress }
        });
    }
}

#[command]
pub fn init_media_control(app_handle: AppHandle) {
    let handle = app_handle.clone();
    let manager = MediaControlManager::new(handle).unwrap();

    app_handle.manage(Mutex::new(manager));
}

#[command]
pub fn set_metadata(state: State<'_, Mutex<MediaControlManager>>, metadata: Metadata) {
    let mut manager = state.lock().unwrap();
    manager.set_metadata(metadata);
}

#[command]
pub fn set_playback(state: State<'_, Mutex<MediaControlManager>>, paused: bool, position: f64) {
    let mut manager = state.lock().unwrap();
    manager.set_playback(paused, position);
}

#[command]
pub fn attach_media_control(state: State<'_, Mutex<MediaControlManager>>, app_handle: AppHandle) {
    let mut manager = state.lock().unwrap();
    manager.attach_media_control(app_handle);
}

#[command]
pub fn detach_media_control(state: State<'_, Mutex<MediaControlManager>>) {
    let mut manager = state.lock().unwrap();
    manager.detach_media_control();
}
