use clap::{Arg, ArgAction, Command};
use serde_json::json;
use std::fs;
use std::path::Path;
use std::process::Command as ProcessCommand;

fn main() {
    let app_version = env!("CARGO_PKG_VERSION");

    // 获取系统信息
    let os_info = std::env::consts::OS;
    let arch_info = std::env::consts::ARCH;

    // 自定义版本信息
    let version_string = format!("{}\n系统: {} ({})", app_version, os_info, arch_info);

    let matches = Command::new("PicSharp")
        .version(version_string.clone())
        .about("PicSharp -- Efficient Image Compression Tool")
        .subcommand_required(false)
        .help_template("\
{before-help}{name} {version}
{about}

{usage-heading} {usage}

{all-args}{after-help}
")
        .arg(
            clap::Arg::new("version")
                .short('v')
                .long("version")
                .help("输出版本号和系统信息")
                .action(ArgAction::Version)
                .global(true),
        )
        // CLI模式是默认模式，无需子命令
        .arg(
            Arg::new("compress")
                .short('c')
                .long("compress")
                .help("压缩图片文件")
                .long_help("压缩一个或多个指定的图片文件或文件夹，完成后输出JSON格式结果")
                .action(ArgAction::SetTrue)
                .conflicts_with("gui"),
        )
        .arg(
            Arg::new("paths")
                .help("文件或文件夹路径")
                .long_help("指定要处理的文件或文件夹路径，可以是单个文件、多个文件或文件夹")
                .num_args(1..)
                .last(true),
        )
        // GUI模式子命令
        .subcommand(
            Command::new("gui")
                .about("GUI应用模式 - 启动图形用户界面")
                .visible_alias("u")
                .display_order(1)
                .arg(
                    Arg::new("compress")
                        .short('c')
                        .long("compress")
                        .help("图片压缩")
                        .long_help("启动GUI应用并直接进入图片压缩模式，可以指定一个或多个文件路径")
                        .action(ArgAction::SetTrue)
                        .conflicts_with("watch"),
                )
                .arg(
                    Arg::new("watch")
                        .short('w')
                        .long("watch")
                        .help("监听文件夹新增图片并压缩")
                        .long_help("启动GUI应用并直接进入文件夹监听模式，监听指定文件夹中新增的图片并自动压缩")
                        .action(ArgAction::SetTrue)
                        .conflicts_with("compress"),
                )
                .arg(
                    Arg::new("paths")
                        .help("文件或文件夹路径")
                        .long_help("指定要处理的文件或文件夹路径，可以是单个文件、多个文件或文件夹")
                        .num_args(1..)
                        .last(true),
                ),
        )
        .get_matches();

    // 处理GUI模式
    if let Some(gui_matches) = matches.subcommand_matches("gui") {
        let mut command = ProcessCommand::new("./PicSharp");

        // 添加-c或--compress参数
        if gui_matches.get_flag("compress") {
            command.arg("--compress");

            // 检查输入路径是否有效
            if let Some(paths) = gui_matches.get_many::<String>("paths") {
                let paths_vec: Vec<&String> = paths.collect();

                // 验证路径是否存在和可访问
                for path in &paths_vec {
                    if !path_exists(path) {
                        output_error_json(&format!("路径不存在或无法访问: {}", path));
                        return;
                    }
                }

                // 添加文件路径参数
                for path in paths_vec {
                    command.arg(path);
                }
            }
        }
        // 添加-w或--watch参数
        else if gui_matches.get_flag("watch") {
            command.arg("--watch");

            // 检查输入路径是否有效
            if let Some(paths) = gui_matches.get_many::<String>("paths") {
                let paths_vec: Vec<&String> = paths.collect();

                // 只使用第一个路径
                if !paths_vec.is_empty() {
                    let path = paths_vec[0];

                    // 验证路径是否存在且是文件夹
                    if !dir_exists(path) {
                        output_error_json(&format!("路径不存在、不是文件夹或无法访问: {}", path));
                        return;
                    }

                    command.arg(path);
                }
            }
        }
        // 无子参数，仅启动GUI
        else {
            // 无需添加参数，直接启动主程序
        }

        let _ = command.spawn().expect("failed to launch app");
    }
    // 处理CLI模式（默认模式）
    else {
        // 处理-c或--compress参数
        if matches.get_flag("compress") {
            // 检查输入路径是否有效
            if let Some(paths) = matches.get_many::<String>("paths") {
                let paths_vec: Vec<&String> = paths.collect();

                // 验证路径是否存在和可访问
                for path in &paths_vec {
                    if !path_exists(path) {
                        output_error_json(&format!("路径不存在或无法访问: {}", path));
                        return;
                    }
                }

                // 执行压缩逻辑
                compress_files(&paths_vec);
            } else {
                output_error_json("请指定至少一个文件或文件夹路径");
            }
        }
        // 没有参数时显示帮助
        else if !matches.contains_id("paths") {
            // 通过重新解析并添加help参数来显示帮助
            let _ = Command::new("PicSharp")
                .version(version_string)
                .about("PicSharp -- Efficient Image Compression Tool")
                .arg(
                    clap::Arg::new("help")
                        .short('h')
                        .long("help")
                        .help("显示帮助信息")
                        .action(ArgAction::Help),
                )
                .get_matches();
        }
    }
}

// 检查路径是否存在且可访问
fn path_exists(path: &str) -> bool {
    Path::new(path).exists()
}

// 检查路径是否存在且是文件夹
fn dir_exists(path: &str) -> bool {
    let path = Path::new(path);
    path.exists() && path.is_dir()
}

// 输出JSON格式错误信息
fn output_error_json(message: &str) {
    let error_json = json!({
        "status": "error",
        "message": message
    });

    println!("{}", serde_json::to_string_pretty(&error_json).unwrap());
}

// 压缩文件的CLI逻辑
fn compress_files(paths: &[&String]) {
    // 模拟压缩过程，实际实现应该调用实际的压缩功能
    println!("开始压缩...");

    // 在这里添加实际的文件压缩逻辑
    // ...

    // 输出成功的JSON结果
    let result_json = json!({
        "status": "success",
        "compressed_files": paths,
        "message": "压缩完成"
    });

    println!("{}", serde_json::to_string_pretty(&result_json).unwrap());
}
