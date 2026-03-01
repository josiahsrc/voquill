# Keep ggml on a conservative ARM baseline for CI stability on GitHub macOS runners.
set(GGML_NATIVE OFF CACHE BOOL "" FORCE)
set(GGML_CPU_ARM_ARCH "armv8.2-a+dotprod" CACHE STRING "" FORCE)
