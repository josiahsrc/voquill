#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const platformOverride = process.env.VOQUILL_DESKTOP_PLATFORM?.trim();

const PLATFORM_SCRIPTS = {
  darwin: 'dev:mac',
  win32: 'dev:windows',
  linux: 'dev:linux'
};

/**
 * Detect if Vulkan SDK is available for compilation.
 * Returns true if Vulkan SDK is detected (required for building with GPU support).
 */
function isVulkanSdkAvailable() {
  const platform = process.platform;

  if (platform === 'win32') {
    // Check for VULKAN_SDK environment variable (required for compilation)
    const vulkanSdk = process.env.VULKAN_SDK;
    if (vulkanSdk && existsSync(vulkanSdk)) {
      console.log('[gpu-detect] Found Vulkan SDK at:', vulkanSdk);
      return true;
    }

    console.log('[gpu-detect] Vulkan SDK not found (VULKAN_SDK env var not set)');
    return false;
  }

  if (platform === 'linux') {
    // Check for VULKAN_SDK or common Linux Vulkan dev paths
    const vulkanSdk = process.env.VULKAN_SDK;
    if (vulkanSdk && existsSync(vulkanSdk)) {
      console.log('[gpu-detect] Found Vulkan SDK at:', vulkanSdk);
      return true;
    }

    // Check for vulkan development headers (indicates SDK is installed)
    const linuxDevPaths = [
      '/usr/include/vulkan/vulkan.h',
      '/usr/local/include/vulkan/vulkan.h'
    ];
    for (const devPath of linuxDevPaths) {
      if (existsSync(devPath)) {
        console.log('[gpu-detect] Found Vulkan dev headers at:', devPath);
        return true;
      }
    }

    console.log('[gpu-detect] Vulkan SDK not found on Linux');
    return false;
  }

  // macOS uses Metal, not Vulkan for GPU acceleration
  return false;
}

const resolvedPlatform = platformOverride || process.platform;
const preferGpu = isVulkanSdkAvailable();
let selectedScript = PLATFORM_SCRIPTS[resolvedPlatform];
if (preferGpu) {
  if (resolvedPlatform === 'linux') {
    selectedScript = 'dev:linux:gpu';
  } else if (resolvedPlatform === 'win32') {
    selectedScript = 'dev:windows:gpu';
  }
}

console.log(`[gpu-detect] Vulkan available: ${preferGpu}, using script: ${selectedScript}`);

if (!selectedScript) {
  console.error(
    `Unable to determine desktop dev script for platform "${resolvedPlatform}". ` +
      'Set VOQUILL_DESKTOP_PLATFORM to darwin, win32, or linux to override.'
  );
  process.exit(1);
}

const npmNodeExecPath = process.env.npm_node_execpath || process.execPath;
const npmExecPath = process.env.npm_execpath;

// Prefer invoking the npm CLI the same way npm itself would spawn lifecycle scripts.
const child = npmExecPath
  ? spawn(npmNodeExecPath, [npmExecPath, 'run', selectedScript], {
      stdio: 'inherit',
      env: process.env
    })
  : spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', selectedScript], {
      stdio: 'inherit',
      env: process.env,
      shell: process.platform === 'win32'
    });

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error(`Failed to start ${selectedScript}:`, error);
  process.exit(1);
});
