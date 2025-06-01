use objc2::{
    define_class, msg_send, rc::Retained, AllocAnyThread, ClassType, DeclaredClass,
    MainThreadMarker,
};
use objc2_app_kit::{NSApplication, NSPasteboard, NSUpdateDynamicServices};
use objc2_foundation::{
    ns_string, NSArray, NSDictionary, NSError, NSInteger, NSObject, NSString, NSURL,
};
use tauri::Emitter;

use std::{
    error::Error,
    ffi::CStr,
    fmt::Display,
    path::PathBuf,
    str,
    sync::atomic::{AtomicBool, Ordering},
    time::{Duration, Instant},
};

use crate::Inspect;

// There's no way to tell if the finder menu button was clicked on startup or later in the program's
// lifecycle. Thus, we must have some sort of "startup duration" to know when to send the inspect to
// the startup window or if we must create a new window.
const STARTUP_DURATION: Duration = Duration::from_millis(1000);

#[derive(Debug)]
pub struct StartupInspect {
    startup_time: Instant,
    startup_used: AtomicBool,
    inner: Inspect,
}

define_class!(
    #[unsafe(super(NSObject))]
    #[name = "ContextMenu"]
    #[ivars = StartupInspect]
    struct ContextMenu;

    impl ContextMenu {
        #[unsafe(method(nsCompress:userData:error:))]
        fn _ns_compress(
            &self,
            pasteboard: *mut NSPasteboard,
            _user_data: *mut NSString,
            error: *mut *mut NSError
        ) {
            let startup_inspect = self.ivars();
            if let Err(err) = unsafe {self.inspect_files("ns_compress", pasteboard, startup_inspect) } {
                if !error.is_null() {
                    unsafe {
                        *error = Retained::into_raw(NSError::errorWithDomain_code_userInfo(
                            // TODO: reference string from config
                            ns_string!("com.PicSharp.app"),
                            err.code(),
                            Some(&NSDictionary::from_slices(
                                &[ns_string!("description")],
                                &[NSString::from_str(&err.to_string()).as_ref()],
                            )),
                        ));
                    }
                }

                startup_inspect.inner.error(err);
            }
        }

        #[unsafe(method(nsWatchAndCompress:userData:error:))]
        fn _ns_watch_and_compress(
            &self,
            pasteboard: *mut NSPasteboard,
            _user_data: *mut NSString,
            error: *mut *mut NSError
        ) {
            let startup_inspect = self.ivars();
            if let Err(err) = unsafe {self.inspect_files("ns_watch_and_compress", pasteboard, startup_inspect) } {
                if !error.is_null() {
                    unsafe {
                        *error = Retained::into_raw(NSError::errorWithDomain_code_userInfo(
                            // TODO: reference string from config
                            ns_string!("com.PicSharp.app"),
                            err.code(),
                            Some(&NSDictionary::from_slices(
                                &[ns_string!("description")],
                                &[NSString::from_str(&err.to_string()).as_ref()],
                            )),
                        ));
                    }
                }

                startup_inspect.inner.error(err);
            }
        }
    }
);

impl ContextMenu {
    fn init_with(inspect: Inspect) -> Retained<Self> {
        let this = Self::alloc().set_ivars(StartupInspect {
            startup_time: Instant::now(),
            startup_used: AtomicBool::new(false),
            inner: inspect,
        });
        unsafe { msg_send![super(this), init] }
    }

    unsafe fn inspect_files(
        &self,
        mode: &str,
        pasteboard: *mut NSPasteboard,
        startup_inspect: &StartupInspect,
    ) -> Result<(), FinderError> {
        let paths = (*pasteboard)
            .readObjectsForClasses_options(&NSArray::from_slice(&[NSURL::class()]), None)
            .ok_or(FinderError::FailedToGetPath)?;
        let file_paths = paths
            .iter()
            .map(|path| {
                let url_path = path
                    .downcast::<NSURL>()
                    .map_err(|_| FinderError::FailedToGetPath)?
                    .path()
                    .ok_or(FinderError::PathInvalidOrNoLongerExists)?;
                let utf8_path = str::from_utf8(CStr::from_ptr(url_path.UTF8String()).to_bytes())
                    .map_err(|_| FinderError::PathInvalidUtf8)?;
                Ok(PathBuf::from(utf8_path))
            })
            .collect::<Result<Vec<PathBuf>, FinderError>>()?;

        log::info!("file_paths: {:?}", file_paths);

        // 如果没有文件路径，直接返回
        if file_paths.is_empty() {
            return Ok(());
        }

        // 检查是否是首次使用（startup_used为false）并且当前时间与启动时间的差值小于预设的启动持续时间
        // 这段代码用于判断应用是否处于启动阶段，如果是首次使用且在启动时间窗口内，则执行特定的启动逻辑
        if !startup_inspect.startup_used.load(Ordering::Relaxed)
            && Instant::now().duration_since(startup_inspect.startup_time) < STARTUP_DURATION
        {
            startup_inspect.startup_used.store(true, Ordering::Relaxed);
            startup_inspect.inner.send(mode, file_paths)?;
        } else {
            // let inspect = Inspect::new(startup_inspect.inner.app_handle())?;
            // inspect.send(mode, file_paths)?;
            startup_inspect
                .inner
                .app_handle()
                .emit_to("main", mode, file_paths)?;
        }

        Ok(())
    }
}

pub fn load(inspect: Inspect) {
    unsafe {
        let mtm = MainThreadMarker::new().unwrap();
        NSApplication::sharedApplication(mtm)
            .setServicesProvider(Some(&ContextMenu::init_with(inspect)));

        NSUpdateDynamicServices();
    }
}

#[derive(Debug)]
pub enum FinderError {
    Tauri(tauri::Error),
    FailedToGetPath,
    PathInvalidOrNoLongerExists,
    PathInvalidUtf8,
}

impl Error for FinderError {}

impl FinderError {
    pub fn code(&self) -> NSInteger {
        match self {
            FinderError::Tauri(_) => 1001,
            FinderError::FailedToGetPath => 1002,
            FinderError::PathInvalidOrNoLongerExists => 1003,
            FinderError::PathInvalidUtf8 => 1004,
        }
    }
}

impl Display for FinderError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            FinderError::Tauri(err) => err.fmt(f),
            FinderError::FailedToGetPath => {
                write!(f, "Failed to get file path from the context menu")
            }
            FinderError::PathInvalidOrNoLongerExists => {
                write!(f, "Failed to parse file path from the context menu")
            }
            FinderError::PathInvalidUtf8 => {
                write!(f, "Failed to parse file path from the context menu")
            }
        }
    }
}

impl From<tauri::Error> for FinderError {
    fn from(err: tauri::Error) -> Self {
        FinderError::Tauri(err)
    }
}
