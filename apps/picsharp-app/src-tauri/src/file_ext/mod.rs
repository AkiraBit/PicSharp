#[cfg(target_os = "macos")]
#[path = "finder.rs"]
mod platform;

#[cfg(not(target_os = "macos"))]
mod platform {
    use crate::Inspect;
    pub fn load(_inspect: Inspect) {}
}

pub use platform::*;
