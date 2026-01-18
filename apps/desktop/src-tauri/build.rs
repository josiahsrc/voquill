fn main() {
    #[cfg(all(target_os = "windows", feature = "windows-gpu"))]
    {
        println!("cargo:rustc-link-arg=/DELAYLOAD:vulkan-1.dll");
        println!("cargo:rustc-link-lib=delayimp");
    }

    tauri_build::build()
}
