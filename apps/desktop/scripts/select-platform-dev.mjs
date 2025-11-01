#!/usr/bin/env node

import { spawn } from 'node:child_process';

const platformOverride = process.env.VOQUILL_DESKTOP_PLATFORM?.trim();

const PLATFORM_SCRIPTS = {
  darwin: 'dev:mac',
  win32: 'dev:windows',
  linux: 'dev:linux'
};

const resolvedPlatform = platformOverride || process.platform;
const preferGpu = true;
let selectedScript = PLATFORM_SCRIPTS[resolvedPlatform];
if (preferGpu) {
  if (resolvedPlatform === 'linux') {
    selectedScript = 'dev:linux:gpu';
  } else if (resolvedPlatform === 'win32') {
    selectedScript = 'dev:windows:gpu';
  }
}

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
