#!/usr/bin/env node

import { spawn } from 'node:child_process';

const platformOverride = process.env.VOQUILL_DESKTOP_PLATFORM?.trim();

const PLATFORM_SCRIPTS = {
  darwin: 'dev:mac',
  win32: 'dev:windows',
  linux: 'dev:linux'
};

const resolvedPlatform = platformOverride || process.platform;
const selectedScript = PLATFORM_SCRIPTS[resolvedPlatform];

if (!selectedScript) {
  console.error(
    `Unable to determine desktop dev script for platform "${resolvedPlatform}". ` +
      'Set VOQUILL_DESKTOP_PLATFORM to darwin, win32, or linux to override.'
  );
  process.exit(1);
}

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const child = spawn(npmCommand, ['run', selectedScript], {
  stdio: 'inherit',
  shell: false,
  env: process.env
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
