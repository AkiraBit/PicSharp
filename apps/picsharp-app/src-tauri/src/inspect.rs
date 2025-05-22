use std::{
    error::Error,
    mem,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicUsize, Ordering},
        Arc, Mutex,
    },
};

use tauri::{AppHandle, Emitter, Listener, Manager};
use tauri_plugin_fs::FsExt;

static ID: AtomicUsize = AtomicUsize::new(0);

#[derive(Debug)]
pub struct Inspect {
    app: AppHandle,
    pub state: Arc<Mutex<InspectState>>,
}

impl Inspect {
    pub fn new(app: AppHandle) -> tauri::Result<Inspect> {
        // TODO: if we know the path on creation, we can pass it as an arg in the url, rather than emitting events later

        let main_window = app.get_webview_window("main").unwrap();
        let main_window_label = main_window.label().to_string();

        log::info!("main_window_label: {}", main_window_label);

        let inspect = Inspect {
            app: app.clone(),
            state: Arc::new(Mutex::new(InspectState {
                label: main_window_label.clone(),
                ready: false,
                paths: None,
                mode: None,
                errors: Vec::new(),
            })),
        };

        let state = inspect.state.clone();
        {
            let main_window_label = main_window_label.clone();
            main_window.listen("ready", move |event| {
                let mut state = state.lock().unwrap();
                // For some reason, the "ready" event is received from all windows, even though we
                // explicitly listen on a specific window. I suspect this is a Tauri bug, but for now
                // this is the workaround.
                match serde_json::from_str::<String>(event.payload()) {
                    Ok(payload) => {
                        log::info!("received payload: {}", payload);
                        if payload == main_window_label {
                            log::info!("ready payload: {}", payload);
                            if let Err(err) = state.ready(&app) {
                                state.error(&app, err);
                            }

                            app.unlisten(event.id());
                        }
                    }
                    Err(err) => state.error(&app, err),
                }
            });
        }

        Ok(inspect)
    }

    #[allow(dead_code)]
    pub fn app_handle(&self) -> AppHandle {
        self.app.clone()
    }

    #[allow(dead_code)]
    pub fn send(&self, mode: &str, paths: Vec<PathBuf>) -> tauri::Result<()> {
        let mut state = self.state.lock().unwrap();
        state.send(&self.app, mode, paths)
    }

    #[allow(dead_code)]
    pub fn error_string(&self, error: String) {
        let mut state = self.state.lock().unwrap();
        state.error_string(&self.app, error)
    }

    #[allow(dead_code)]
    pub fn error<T: Error>(&self, err: T) {
        self.error_string(err.to_string());
    }

    pub fn allow_file(&self, paths: &Vec<PathBuf>) {
        let mut state = self.state.lock().unwrap();
        state.allow_file(&self.app, paths)
    }
}

#[derive(Debug)]
pub struct InspectState {
    pub label: String,
    ready: bool,
    paths: Option<Vec<PathBuf>>,
    mode: Option<String>,
    // Errors passed to the client to be displayed (or logged)
    errors: Vec<String>,
}

impl InspectState {
    #[allow(dead_code)]
    pub fn send(&mut self, app: &AppHandle, mode: &str, paths: Vec<PathBuf>) -> tauri::Result<()> {
        match self.ready {
            true => {
                log::info!("sending to {} with mode {}", self.label, mode);
                self.allow_file(app, &paths);
                app.emit_to(&self.label, mode, paths)?;
            }
            false => {
                self.paths = Some(paths);
                self.mode = Some(mode.to_string());
            }
        }

        Ok(())
    }

    pub fn ready(&mut self, app: &AppHandle) -> tauri::Result<()> {
        self.ready = true;

        if let Some(paths) = self.paths.take() {
            self.allow_file(app, &paths);
            if let Some(mode) = self.mode.take() {
                app.emit_to(&self.label, mode.as_str(), paths)?;
            }

            // No longer using self.errors, so clear out the allocation
            for error in mem::take(&mut self.errors) {
                self.error_string(app, error);
            }
        }

        Ok(())
    }

    pub fn error_string(&mut self, app: &AppHandle, error: String) {
        match self.ready {
            true => {
                // TODO: if this errors, save to log file, ignore result for now
                let _ = app.emit_to(&self.label, "error", error);
            }
            false => {
                self.errors.push(error);
            }
        }
    }

    pub fn error<T: Error>(&mut self, app: &AppHandle, err: T) {
        self.error_string(app, err.to_string());
    }

    pub fn allow_file(&mut self, app: &AppHandle, paths: &Vec<PathBuf>) {
        for path in paths {
            if let Err(err) = app.fs_scope().allow_file(path) {
                self.error(app, err);
            }
        }
    }
}
