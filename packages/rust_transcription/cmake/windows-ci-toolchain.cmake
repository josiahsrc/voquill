# Disable native CPU detection so the binary runs on any x86-64 CPU, not just the CI runner's.
set(GGML_NATIVE OFF CACHE BOOL "" FORCE)
