use cmake::Config;
use glob::glob;
use std::env;
use std::path::{Path, PathBuf};
use std::process::Command;
use walkdir::DirEntry;

enum WindowsVariant {
    Msvc,
    Other,
}

enum AppleVariant {
    MacOS,
    Other,
}

enum TargetOs {
    Windows(WindowsVariant),
    Apple(AppleVariant),
    Linux,
    Android,
}

macro_rules! debug_log {
    ($($arg:tt)*) => {
        if std::env::var("BUILD_DEBUG").is_ok() {
            println!("cargo:warning=[DEBUG] {}", format!($($arg)*));
        }
    };
}

fn parse_target_os() -> Result<(TargetOs, String), String> {
    let target = env::var("TARGET").unwrap();

    if target.contains("windows") {
        if target.ends_with("-windows-msvc") {
            Ok((TargetOs::Windows(WindowsVariant::Msvc), target))
        } else {
            Ok((TargetOs::Windows(WindowsVariant::Other), target))
        }
    } else if target.contains("apple") {
        if target.ends_with("-apple-darwin") {
            Ok((TargetOs::Apple(AppleVariant::MacOS), target))
        } else {
            Ok((TargetOs::Apple(AppleVariant::Other), target))
        }
    } else if target.contains("android")
        || target == "aarch64-linux-android"
        || target == "armv7-linux-androideabi"
        || target == "i686-linux-android"
        || target == "x86_64-linux-android"
    {
        // Handle both full android targets and short names like arm64-v8a that cargo ndk might use
        Ok((TargetOs::Android, target))
    } else if target.contains("linux") {
        Ok((TargetOs::Linux, target))
    } else {
        Err(target)
    }
}

fn get_cargo_target_dir() -> Result<PathBuf, Box<dyn std::error::Error>> {
    let out_dir = env::var("OUT_DIR")?;
    let path = PathBuf::from(out_dir);
    let target_dir = path
        .ancestors()
        .nth(3)
        .ok_or("OUT_DIR is not deep enough")?;
    Ok(target_dir.to_path_buf())
}

fn extract_lib_names(out_dir: &Path, build_shared_libs: bool) -> Vec<String> {
    let lib_pattern = if cfg!(windows) {
        "*.lib"
    } else if cfg!(target_os = "macos") {
        if build_shared_libs {
            "*.dylib"
        } else {
            "*.a"
        }
    } else if build_shared_libs {
        "*.so"
    } else {
        "*.a"
    };
    let libs_dir = out_dir.join("lib*");
    let pattern = libs_dir.join(lib_pattern);
    debug_log!("Extract libs {}", pattern.display());

    let mut lib_names: Vec<String> = Vec::new();

    // Process the libraries based on the pattern
    for entry in glob(pattern.to_str().unwrap()).unwrap() {
        match entry {
            Ok(path) => {
                let stem = path.file_stem().unwrap();
                let stem_str = stem.to_str().unwrap();

                // Remove the "lib" prefix if present
                let lib_name = if stem_str.starts_with("lib") {
                    stem_str.strip_prefix("lib").unwrap_or(stem_str)
                } else {
                    if path.extension() == Some(std::ffi::OsStr::new("a")) {
                        let target = path.parent().unwrap().join(format!("lib{}.a", stem_str));
                        std::fs::rename(&path, &target).unwrap_or_else(|e| {
                            panic!("Failed to rename {path:?} to {target:?}: {e:?}");
                        })
                    }
                    stem_str
                };
                lib_names.push(lib_name.to_string());
            }
            Err(e) => println!("cargo:warning=error={}", e),
        }
    }
    lib_names
}

fn extract_lib_assets(out_dir: &Path) -> Vec<PathBuf> {
    let shared_lib_pattern = if cfg!(windows) {
        "*.dll"
    } else if cfg!(target_os = "macos") {
        "*.dylib"
    } else {
        "*.so"
    };

    let shared_libs_dir = if cfg!(windows) { "bin" } else { "lib" };
    let libs_dir = out_dir.join(shared_libs_dir);
    let pattern = libs_dir.join(shared_lib_pattern);
    debug_log!("Extract lib assets {}", pattern.display());
    let mut files = Vec::new();

    for entry in glob(pattern.to_str().unwrap()).unwrap() {
        match entry {
            Ok(path) => {
                files.push(path);
            }
            Err(e) => eprintln!("cargo:warning=error={}", e),
        }
    }

    files
}

fn macos_link_search_path() -> Option<String> {
    let output = Command::new("clang")
        .arg("--print-search-dirs")
        .output()
        .ok()?;
    if !output.status.success() {
        println!(
            "failed to run 'clang --print-search-dirs', continuing without a link search path"
        );
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines() {
        if line.contains("libraries: =") {
            let path = line.split('=').nth(1)?;
            return Some(format!("{}/lib/darwin", path));
        }
    }

    println!("failed to determine link search path, continuing without it");
    None
}

fn validate_android_ndk(ndk_path: &str) -> Result<(), String> {
    let ndk_path = Path::new(ndk_path);

    if !ndk_path.exists() {
        return Err(format!(
            "Android NDK path does not exist: {}",
            ndk_path.display()
        ));
    }

    let toolchain_file = ndk_path.join("build/cmake/android.toolchain.cmake");
    if !toolchain_file.exists() {
        return Err(format!(
            "Android NDK toolchain file not found: {}\n\
             This indicates an incomplete NDK installation.",
            toolchain_file.display()
        ));
    }

    Ok(())
}

fn is_hidden(e: &DirEntry) -> bool {
    e.file_name()
        .to_str()
        .map(|s| s.starts_with('.'))
        .unwrap_or_default()
}

fn main() {
    println!("cargo:rerun-if-changed=build.rs");

    let (target_os, target_triple) =
        parse_target_os().unwrap_or_else(|t| panic!("Failed to parse target os {t}"));
    let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());

    let target_dir = get_cargo_target_dir().unwrap();
    let manifest_dir = env::var("CARGO_MANIFEST_DIR").expect("Failed to get CARGO_MANIFEST_DIR");
    let llama_src = Path::new(&manifest_dir).join("llama.cpp");
    let build_shared_libs = cfg!(feature = "dynamic-link");

    let build_shared_libs = std::env::var("LLAMA_BUILD_SHARED_LIBS")
        .map(|v| v == "1")
        .unwrap_or(build_shared_libs);
    let profile = env::var("LLAMA_LIB_PROFILE").unwrap_or("Release".to_string());
    let static_crt = env::var("LLAMA_STATIC_CRT")
        .map(|v| v == "1")
        .unwrap_or(false);

    println!("cargo:rerun-if-env-changed=LLAMA_LIB_PROFILE");
    println!("cargo:rerun-if-env-changed=LLAMA_BUILD_SHARED_LIBS");
    println!("cargo:rerun-if-env-changed=LLAMA_STATIC_CRT");

    debug_log!("TARGET: {}", target_triple);
    debug_log!("CARGO_MANIFEST_DIR: {}", manifest_dir);
    debug_log!("TARGET_DIR: {}", target_dir.display());
    debug_log!("OUT_DIR: {}", out_dir.display());
    debug_log!("BUILD_SHARED: {}", build_shared_libs);

    // Make sure that changes to the llama.cpp project trigger a rebuild.
    let rebuild_on_children_of = [
        llama_src.join("src"),
        llama_src.join("ggml/src"),
        llama_src.join("common"),
    ];
    for entry in walkdir::WalkDir::new(&llama_src)
        .into_iter()
        .filter_entry(|e| !is_hidden(e))
    {
        let entry = entry.expect("Failed to obtain entry");
        let rebuild = entry
            .file_name()
            .to_str()
            .map(|f| f.starts_with("CMake"))
            .unwrap_or_default()
            || rebuild_on_children_of
                .iter()
                .any(|src_folder| entry.path().starts_with(src_folder));
        if rebuild {
            println!("cargo:rerun-if-changed={}", entry.path().display());
        }
    }

    // Speed up build
    env::set_var(
        "CMAKE_BUILD_PARALLEL_LEVEL",
        std::thread::available_parallelism()
            .unwrap()
            .get()
            .to_string(),
    );

    // Bindings
    let mut bindings_builder = bindgen::Builder::default()
        .header("wrapper.h")
        .clang_arg(format!("-I{}", llama_src.join("include").display()))
        .clang_arg(format!("-I{}", llama_src.join("ggml/include").display()))
        .parse_callbacks(Box::new(bindgen::CargoCallbacks::new()))
        .derive_partialeq(true)
        .allowlist_function("ggml_.*")
        .allowlist_type("ggml_.*")
        .allowlist_function("llama_.*")
        .allowlist_type("llama_.*")
        .prepend_enum_name(false);

    // Configure mtmd feature if enabled
    if cfg!(feature = "mtmd") {
        bindings_builder = bindings_builder
            .header("wrapper_mtmd.h")
            .allowlist_function("mtmd_.*")
            .allowlist_type("mtmd_.*");
    }

    // Configure Android-specific bindgen settings
    if matches!(target_os, TargetOs::Android) {
        // Detect Android NDK from environment variables
        let android_ndk = env::var("ANDROID_NDK")
            .or_else(|_| env::var("ANDROID_NDK_ROOT"))
            .or_else(|_| env::var("NDK_ROOT"))
            .or_else(|_| env::var("CARGO_NDK_ANDROID_NDK"))
            .or_else(|_| {
                // Try to auto-detect NDK from Android SDK
                if let Some(home) = env::home_dir() {
                    let android_home = env::var("ANDROID_HOME")
                        .or_else(|_| env::var("ANDROID_SDK_ROOT"))
                        .unwrap_or_else(|_| format!("{}/Android/Sdk", home.display()));

                    let ndk_dir = format!("{}/ndk", android_home);
                    if let Ok(entries) = std::fs::read_dir(&ndk_dir) {
                        let mut versions: Vec<_> = entries
                            .filter_map(|e| e.ok())
                            .filter(|e| e.file_type().map(|t| t.is_dir()).unwrap_or(false))
                            .filter_map(|e| e.file_name().to_str().map(|s| s.to_string()))
                            .collect();
                        versions.sort();
                        if let Some(latest) = versions.last() {
                            return Ok(format!("{}/{}", ndk_dir, latest));
                        }
                    }
                }
                Err(env::VarError::NotPresent)
            })
            .unwrap_or_else(|_| {
                panic!(
                    "Android NDK not found. Please set one of: ANDROID_NDK, NDK_ROOT, ANDROID_NDK_ROOT\n\
                     Current target: {}\n\
                     Download from: https://developer.android.com/ndk/downloads",
                    target_triple
                );
            });

        // Get Android API level
        let android_api = env::var("ANDROID_API_LEVEL")
            .or_else(|_| env::var("ANDROID_PLATFORM").map(|p| p.replace("android-", "")))
            .or_else(|_| env::var("CARGO_NDK_ANDROID_PLATFORM").map(|p| p.replace("android-", "")))
            .unwrap_or_else(|_| "28".to_string());

        // Determine host platform
        let host_tag = if cfg!(target_os = "macos") {
            "darwin-x86_64"
        } else if cfg!(target_os = "linux") {
            "linux-x86_64"
        } else if cfg!(target_os = "windows") {
            "windows-x86_64"
        } else {
            panic!("Unsupported host platform for Android NDK");
        };

        // Map Rust target to Android architecture
        let android_target_prefix = if target_triple.contains("aarch64") {
            "aarch64-linux-android"
        } else if target_triple.contains("armv7") {
            "arm-linux-androideabi"
        } else if target_triple.contains("x86_64") {
            "x86_64-linux-android"
        } else if target_triple.contains("i686") {
            "i686-linux-android"
        } else {
            panic!("Unsupported Android target: {}", target_triple);
        };

        // Setup Android toolchain paths
        let toolchain_path = format!("{}/toolchains/llvm/prebuilt/{}", android_ndk, host_tag);
        let sysroot = format!("{}/sysroot", toolchain_path);

        // Validate toolchain existence
        if !std::path::Path::new(&toolchain_path).exists() {
            panic!(
                "Android NDK toolchain not found at: {}\n\
                 Please ensure you have the correct Android NDK for your platform.",
                toolchain_path
            );
        }

        // Find clang builtin includes
        let clang_builtin_includes = {
            let clang_lib_path = format!("{}/lib/clang", toolchain_path);
            std::fs::read_dir(&clang_lib_path).ok().and_then(|entries| {
                entries
                    .filter_map(|e| e.ok())
                    .find(|entry| {
                        entry.file_type().map(|t| t.is_dir()).unwrap_or(false)
                            && entry
                                .file_name()
                                .to_str()
                                .map(|name| name.chars().next().unwrap_or('0').is_ascii_digit())
                                .unwrap_or(false)
                    })
                    .and_then(|entry| {
                        let include_path =
                            format!("{}/{}/include", clang_lib_path, entry.file_name().to_str()?);
                        if std::path::Path::new(&include_path).exists() {
                            Some(include_path)
                        } else {
                            None
                        }
                    })
            })
        };

        // Configure bindgen for Android
        bindings_builder = bindings_builder
            .clang_arg(format!("--sysroot={}", sysroot))
            .clang_arg(format!("-D__ANDROID_API__={}", android_api))
            .clang_arg("-D__ANDROID__");

        // Add include paths in correct order
        if let Some(ref builtin_includes) = clang_builtin_includes {
            bindings_builder = bindings_builder
                .clang_arg("-isystem")
                .clang_arg(builtin_includes);
        }

        bindings_builder = bindings_builder
            .clang_arg("-isystem")
            .clang_arg(format!("{}/usr/include/{}", sysroot, android_target_prefix))
            .clang_arg("-isystem")
            .clang_arg(format!("{}/usr/include", sysroot))
            .clang_arg("-include")
            .clang_arg("stdbool.h")
            .clang_arg("-include")
            .clang_arg("stdint.h");

        // Set additional clang args for cargo ndk compatibility
        if env::var("CARGO_SUBCOMMAND").as_deref() == Ok("ndk") {
            std::env::set_var(
                "BINDGEN_EXTRA_CLANG_ARGS",
                format!("--target={}", target_triple),
            );
        }
    }

    // Fix bindgen header discovery on Windows MSVC
    // Use cc crate to discover MSVC include paths by compiling a dummy file
    if matches!(target_os, TargetOs::Windows(WindowsVariant::Msvc)) {
        // Create a minimal dummy C file to extract compiler flags
        let out_dir = env::var("OUT_DIR").unwrap();
        let dummy_c = Path::new(&out_dir).join("dummy.c");
        std::fs::write(&dummy_c, "int main() { return 0; }").unwrap();
        
        // Use cc crate to get compiler with proper environment setup
        let mut build = cc::Build::new();
        build.file(&dummy_c);
        
        // Get the actual compiler command cc would use
        let compiler = build.try_get_compiler().unwrap();
        
        // Extract include paths by checking compiler's environment
        // cc crate sets up MSVC environment internally
        let env_include = compiler.env().iter()
            .find(|(k, _)| k.eq_ignore_ascii_case("INCLUDE"))
            .map(|(_, v)| v);
            
        if let Some(include_paths) = env_include {
            for include_path in include_paths.to_string_lossy().split(';').filter(|s| !s.is_empty()) {
                bindings_builder = bindings_builder
                    .clang_arg("-isystem")
                    .clang_arg(include_path);
                debug_log!("Added MSVC include path: {}", include_path);
            }
        }
        
        // Add MSVC compatibility flags
        bindings_builder = bindings_builder
            .clang_arg(format!("--target={}", target_triple))
            .clang_arg("-fms-compatibility")
            .clang_arg("-fms-extensions");

        debug_log!("Configured bindgen with MSVC toolchain for target: {}", target_triple);
    }
    let bindings = bindings_builder
        .generate()
        .expect("Failed to generate bindings");

    // Write the generated bindings to an output file
    let bindings_path = out_dir.join("bindings.rs");
    bindings
        .write_to_file(bindings_path)
        .expect("Failed to write bindings");

    println!("cargo:rerun-if-changed=wrapper.h");
    println!("cargo:rerun-if-changed=wrapper_mtmd.h");

    debug_log!("Bindings Created");

    // Build with Cmake

    let mut config = Config::new(&llama_src);

    // Would require extra source files to pointlessly
    // be included in what's uploaded to and downloaded from
    // crates.io, so deactivating these instead
    config.define("LLAMA_BUILD_TESTS", "OFF");
    config.define("LLAMA_BUILD_EXAMPLES", "OFF");
    config.define("LLAMA_BUILD_SERVER", "OFF");
    config.define("LLAMA_BUILD_TOOLS", "OFF");
    config.define("LLAMA_CURL", "OFF");

    if cfg!(feature = "mtmd") {
        config.define("LLAMA_BUILD_COMMON", "ON");
        // mtmd support in llama-cpp is within the tools directory
        config.define("LLAMA_BUILD_TOOLS", "ON");
    }

    // Pass CMAKE_ environment variables down to CMake
    for (key, value) in env::vars() {
        if key.starts_with("CMAKE_") {
            config.define(&key, &value);
        }
    }

    config.define(
        "BUILD_SHARED_LIBS",
        if build_shared_libs { "ON" } else { "OFF" },
    );

    if matches!(target_os, TargetOs::Apple(_)) {
        config.define("GGML_BLAS", "OFF");
    }

    if (matches!(target_os, TargetOs::Windows(WindowsVariant::Msvc))
        && matches!(
            profile.as_str(),
            "Release" | "RelWithDebInfo" | "MinSizeRel"
        ))
    {
        // Debug Rust builds under MSVC turn off optimization even though we're ideally building the release profile of llama.cpp.
        // Looks like an upstream bug:
        // https://github.com/rust-lang/cmake-rs/issues/240
        // For now explicitly reinject the optimization flags that a CMake Release build is expected to have on in this scenario.
        // This fixes CPU inference performance when part of a Rust debug build.
        for flag in &["/O2", "/DNDEBUG", "/Ob2"] {
            config.cflag(flag);
            config.cxxflag(flag);
        }
    }

    config.static_crt(static_crt);

    if matches!(target_os, TargetOs::Android) {
        // Android NDK Build Configuration
        let android_ndk = env::var("ANDROID_NDK")
            .or_else(|_| env::var("NDK_ROOT"))
            .or_else(|_| env::var("ANDROID_NDK_ROOT"))
            .unwrap_or_else(|_| {
                panic!(
                    "Android NDK not found. Please set one of: ANDROID_NDK, NDK_ROOT, ANDROID_NDK_ROOT\n\
                     Download from: https://developer.android.com/ndk/downloads"
                );
            });

        // Validate NDK installation
        if let Err(error) = validate_android_ndk(&android_ndk) {
            panic!("Android NDK validation failed: {}", error);
        }

        // Rerun build script if NDK environment variables change
        println!("cargo:rerun-if-env-changed=ANDROID_NDK");
        println!("cargo:rerun-if-env-changed=NDK_ROOT");
        println!("cargo:rerun-if-env-changed=ANDROID_NDK_ROOT");

        // Set CMake toolchain file for Android
        let toolchain_file = format!("{}/build/cmake/android.toolchain.cmake", android_ndk);
        config.define("CMAKE_TOOLCHAIN_FILE", &toolchain_file);

        // Configure Android platform (API level)
        let android_platform = env::var("ANDROID_PLATFORM").unwrap_or_else(|_| {
            env::var("ANDROID_API_LEVEL")
                .map(|level| format!("android-{}", level))
                .unwrap_or_else(|_| "android-28".to_string())
        });

        println!("cargo:rerun-if-env-changed=ANDROID_PLATFORM");
        println!("cargo:rerun-if-env-changed=ANDROID_API_LEVEL");
        config.define("ANDROID_PLATFORM", &android_platform);

        // Map Rust target to Android ABI
        let android_abi = if target_triple.contains("aarch64") {
            "arm64-v8a"
        } else if target_triple.contains("armv7") {
            "armeabi-v7a"
        } else if target_triple.contains("x86_64") {
            "x86_64"
        } else if target_triple.contains("i686") {
            "x86"
        } else {
            panic!(
                "Unsupported Android target: {}\n\
                 Supported targets: aarch64-linux-android, armv7-linux-androideabi, i686-linux-android, x86_64-linux-android",
                target_triple
            );
        };

        config.define("ANDROID_ABI", android_abi);

        // Configure architecture-specific compiler flags
        match android_abi {
            "arm64-v8a" => {
                config.cflag("-march=armv8-a");
                config.cxxflag("-march=armv8-a");
            }
            "armeabi-v7a" => {
                config.cflag("-march=armv7-a");
                config.cxxflag("-march=armv7-a");
                config.cflag("-mfpu=neon");
                config.cxxflag("-mfpu=neon");
                config.cflag("-mthumb");
                config.cxxflag("-mthumb");
            }
            "x86_64" => {
                config.cflag("-march=x86-64");
                config.cxxflag("-march=x86-64");
            }
            "x86" => {
                config.cflag("-march=i686");
                config.cxxflag("-march=i686");
            }
            _ => {}
        }

        // Android-specific CMake configurations
        config.define("GGML_LLAMAFILE", "OFF");

        // Link Android system libraries
        println!("cargo:rustc-link-lib=log");
        println!("cargo:rustc-link-lib=android");
    }

    if matches!(target_os, TargetOs::Linux)
        && target_triple.contains("aarch64")
        && !env::var(format!("CARGO_FEATURE_{}", "native".to_uppercase())).is_ok()
    {
        // If the native feature is not enabled, we take off the native ARM64 support.
        // It is useful in docker environments where the native feature is not enabled.
        config.define("GGML_NATIVE", "OFF");
        config.define("GGML_CPU_ARM_ARCH", "armv8-a");
    }

    if cfg!(feature = "vulkan") {
        config.define("GGML_VULKAN", "ON");
        match target_os {
            TargetOs::Windows(_) => {
                let vulkan_path = env::var("VULKAN_SDK").expect(
                    "Please install Vulkan SDK and ensure that VULKAN_SDK env variable is set",
                );
                let vulkan_lib_path = Path::new(&vulkan_path).join("Lib");
                println!("cargo:rustc-link-search={}", vulkan_lib_path.display());
                println!("cargo:rustc-link-lib=vulkan-1");

                // workaround for this error: "FileTracker : error FTK1011: could not create the new file tracking log file"
                // it has to do with MSBuild FileTracker not respecting the path
                // limit configuration set in the windows registry.
                // I'm not sure why that's a thing, but this makes my builds work.
                // (crates that depend on llama-cpp-rs w/ vulkan easily exceed the default PATH_MAX on windows)
                env::set_var("TrackFileAccess", "false");
                // since we disabled TrackFileAccess, we can now run into problems with parallel
                // access to pdb files. /FS solves this.
                config.cflag("/FS");
                config.cxxflag("/FS");
            }
            TargetOs::Linux => {
                println!("cargo:rustc-link-lib=vulkan");
            }
            _ => (),
        }
    }

    if cfg!(feature = "cuda") {
        config.define("GGML_CUDA", "ON");

        if cfg!(feature = "cuda-no-vmm") {
            config.define("GGML_CUDA_NO_VMM", "ON");
        }
    }

    // Android doesn't have OpenMP support AFAICT and openmp is a default feature. Do this here
    // rather than modifying the defaults in Cargo.toml just in case someone enables the OpenMP feature
    // and tries to build for Android anyway.
    if cfg!(feature = "openmp") && !matches!(target_os, TargetOs::Android) {
        config.define("GGML_OPENMP", "ON");
    } else {
        config.define("GGML_OPENMP", "OFF");
    }

    // General
    config
        .profile(&profile)
        .very_verbose(std::env::var("CMAKE_VERBOSE").is_ok()) // Not verbose by default
        .always_configure(false);

    let build_dir = config.build();

    // Search paths
    println!("cargo:rustc-link-search={}", out_dir.join("lib").display());
    println!(
        "cargo:rustc-link-search={}",
        out_dir.join("lib64").display()
    );
    println!("cargo:rustc-link-search={}", build_dir.display());

    if cfg!(feature = "cuda") && !build_shared_libs {
        // Re-run build script if CUDA_PATH environment variable changes
        println!("cargo:rerun-if-env-changed=CUDA_PATH");

        // Add CUDA library directories to the linker search path
        for lib_dir in find_cuda_helper::find_cuda_lib_dirs() {
            println!("cargo:rustc-link-search=native={}", lib_dir.display());
        }

        // Platform-specific linking
        if cfg!(target_os = "windows") {
            // ✅ On Windows, use dynamic linking.
            // Static linking is problematic because NVIDIA does not provide culibos.lib,
            // and static CUDA libraries (like cublas_static.lib) are usually not shipped.

            println!("cargo:rustc-link-lib=cudart"); // Links to cudart64_*.dll
            println!("cargo:rustc-link-lib=cublas"); // Links to cublas64_*.dll
            println!("cargo:rustc-link-lib=cublasLt"); // Links to cublasLt64_*.dll

            // Link to CUDA driver API (nvcuda.dll via cuda.lib)
            if !cfg!(feature = "cuda-no-vmm") {
                println!("cargo:rustc-link-lib=cuda");
            }
        } else {
            // ✅ On non-Windows platforms (e.g., Linux), static linking is preferred and supported.
            // Static libraries like cudart_static and cublas_static depend on culibos.

            println!("cargo:rustc-link-lib=static=cudart_static");
            println!("cargo:rustc-link-lib=static=cublas_static");
            println!("cargo:rustc-link-lib=static=cublasLt_static");

            // Link to CUDA driver API (libcuda.so)
            if !cfg!(feature = "cuda-no-vmm") {
                println!("cargo:rustc-link-lib=cuda");
            }

            // culibos is required when statically linking cudart_static
            println!("cargo:rustc-link-lib=static=culibos");
        }
    }

    // Link libraries
    let llama_libs_kind = if build_shared_libs { "dylib" } else { "static" };
    let llama_libs = extract_lib_names(&out_dir, build_shared_libs);
    assert_ne!(llama_libs.len(), 0);

    for lib in llama_libs {
        let link = format!("cargo:rustc-link-lib={}={}", llama_libs_kind, lib);
        debug_log!("LINK {link}",);
        println!("{link}",);
    }

    // OpenMP
    if cfg!(feature = "openmp") && target_triple.contains("gnu") {
        println!("cargo:rustc-link-lib=gomp");
    }

    match target_os {
        TargetOs::Windows(WindowsVariant::Msvc) => {
            println!("cargo:rustc-link-lib=advapi32");
            if cfg!(debug_assertions) {
                println!("cargo:rustc-link-lib=dylib=msvcrtd");
            }
        }
        TargetOs::Linux => {
            println!("cargo:rustc-link-lib=dylib=stdc++");
        }
        TargetOs::Apple(variant) => {
            println!("cargo:rustc-link-lib=framework=Foundation");
            println!("cargo:rustc-link-lib=framework=Metal");
            println!("cargo:rustc-link-lib=framework=MetalKit");
            println!("cargo:rustc-link-lib=framework=Accelerate");
            println!("cargo:rustc-link-lib=c++");

            match variant {
                AppleVariant::MacOS => {
                    // On (older) OSX we need to link against the clang runtime,
                    // which is hidden in some non-default path.
                    //
                    // More details at https://github.com/alexcrichton/curl-rust/issues/279.
                    if let Some(path) = macos_link_search_path() {
                        println!("cargo:rustc-link-lib=clang_rt.osx");
                        println!("cargo:rustc-link-search={}", path);
                    }
                }
                AppleVariant::Other => (),
            }
        }
        _ => (),
    }

    // copy DLLs to target
    if build_shared_libs {
        let libs_assets = extract_lib_assets(&out_dir);
        for asset in libs_assets {
            let asset_clone = asset.clone();
            let filename = asset_clone.file_name().unwrap();
            let filename = filename.to_str().unwrap();
            let dst = target_dir.join(filename);
            debug_log!("HARD LINK {} TO {}", asset.display(), dst.display());
            if !dst.exists() {
                std::fs::hard_link(asset.clone(), dst).unwrap();
            }

            // Copy DLLs to examples as well
            if target_dir.join("examples").exists() {
                let dst = target_dir.join("examples").join(filename);
                debug_log!("HARD LINK {} TO {}", asset.display(), dst.display());
                if !dst.exists() {
                    std::fs::hard_link(asset.clone(), dst).unwrap();
                }
            }

            // Copy DLLs to target/profile/deps as well for tests
            let dst = target_dir.join("deps").join(filename);
            debug_log!("HARD LINK {} TO {}", asset.display(), dst.display());
            if !dst.exists() {
                std::fs::hard_link(asset.clone(), dst).unwrap();
            }
        }
    }
}
