import os from 'os';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import chromedriver from 'chromedriver';
import { preview as createPreviewServer } from 'vite';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

let tauriDriverProcess;
let shuttingDown = false;
let previewServer;
let chromeDriverProcess;
let closingChromeDriver = false;

const projectRoot = path.resolve(__dirname, '..');
const isMac = process.platform === 'darwin';
const previewPort = Number(process.env.WDIO_PREVIEW_PORT ?? 4173);
const isHeadless = process.env.WDIO_HEADLESS !== 'false';
const driverPort = isMac ? Number(process.env.WDIO_CHROMEDRIVER_PORT ?? 9515) : 4444;

function resolveTauriBinary() {
  const override = process.env.TAURI_APPLICATION_PATH;
  if (override) {
    return path.resolve(projectRoot, override);
  }

  const binaryName = process.platform === 'win32' ? 'Voquill.exe' : 'Voquill';
  return path.resolve(projectRoot, 'src-tauri', 'target', 'debug', binaryName);
}

function ensureBinaryExists(binaryPath) {
  if (!fs.existsSync(binaryPath)) {
    throw new Error(
      `Expected Tauri binary at "${binaryPath}" but it was not found. ` +
        'Run "npm run tauri build -- --debug --no-bundle" inside apps/desktop to compile it.'
    );
  }
}

function resolveTauriDriver() {
  const driverName = process.platform === 'win32' ? 'tauri-driver.exe' : 'tauri-driver';
  return path.resolve(os.homedir(), '.cargo', 'bin', driverName);
}

function closeTauriDriver() {
  shuttingDown = true;
  if (tauriDriverProcess && !tauriDriverProcess.killed) {
    tauriDriverProcess.kill();
  }
  tauriDriverProcess = undefined;
}

function waitForHttpServer({ port, requestPath = '/status', timeoutMs = 30000, intervalMs = 500 }) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const request = http.request(
        {
          host: '127.0.0.1',
          port,
          path: requestPath,
          method: 'GET',
          timeout: 2000,
        },
        (response) => {
          response.resume();

          if (response.statusCode && response.statusCode >= 200 && response.statusCode < 500) {
            resolve(undefined);
            return;
          }

          if (Date.now() - startedAt >= timeoutMs) {
            reject(new Error(`Server on port ${port} did not respond with success before timeout.`));
          } else {
            setTimeout(attempt, intervalMs);
          }
        }
      );

      request.on('error', (error) => {
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Could not reach server on port ${port}: ${error.message}`));
        } else {
          setTimeout(attempt, intervalMs);
        }
      });

      request.on('timeout', () => {
        request.destroy();
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Timed out waiting for server on port ${port} to respond.`));
        } else {
          setTimeout(attempt, intervalMs);
        }
      });

      request.end();
    };

    attempt();
  });
}

async function startChromeDriver() {
  if (chromeDriverProcess) {
    return;
  }

  const binaryPath = chromedriver?.path ?? chromedriver;
  if (!binaryPath || typeof binaryPath !== 'string') {
    throw new Error('Could not resolve chromedriver binary path.');
  }

  chromeDriverProcess = spawn(binaryPath, [`--port=${driverPort}`, '--url-base=/', '--allowed-ips=127.0.0.1'], {
    stdio: ['ignore', 'pipe', process.stderr],
  });

  chromeDriverProcess.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  chromeDriverProcess.on('error', (error) => {
    console.error('chromedriver error:', error);
  });

  chromeDriverProcess.on('exit', (code) => {
    chromeDriverProcess = undefined;
    const wasClosing = closingChromeDriver;
    closingChromeDriver = false;
    if (!shuttingDown && !wasClosing) {
      console.error('chromedriver exited unexpectedly with code:', code);
    }
  });

  try {
    await waitForHttpServer({ port: driverPort });
  } catch (error) {
    closeChromeDriver();
    throw error;
  }
}

function closeChromeDriver() {
  if (chromeDriverProcess && !chromeDriverProcess.killed) {
    closingChromeDriver = true;
    chromeDriverProcess.kill();
  }
  if (!chromeDriverProcess) {
    closingChromeDriver = false;
  }
}

async function startPreviewServer() {
  if (previewServer) {
    return;
  }

  previewServer = await createPreviewServer({
    root: projectRoot,
    configFile: path.resolve(projectRoot, 'vite.config.ts'),
    preview: {
      host: '127.0.0.1',
      port: previewPort,
      open: false,
    },
  });

  const httpServer = previewServer.httpServer;
  if (httpServer && !httpServer.listening) {
    await new Promise((resolve, reject) => {
      const handleError = (error) => {
        httpServer.off('listening', handleListening);
        reject(error);
      };

      const handleListening = () => {
        httpServer.off('error', handleError);
        resolve(undefined);
      };

      httpServer.once('error', handleError);
      httpServer.once('listening', handleListening);
    });
  }
}

function closePreviewServer() {
  const server = previewServer;
  previewServer = undefined;

  if (server) {
    server.close().catch((error) => {
      console.error('Failed to close preview server:', error);
    });
  }
}

function registerShutdownHooks() {
  const cleanup = () => {
    try {
      closeTauriDriver();
      closePreviewServer();
      closeChromeDriver();
    } finally {
      process.exit();
    }
  };

  process.on('exit', () => {
    closeTauriDriver();
    closePreviewServer();
    closeChromeDriver();
  });
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('SIGHUP', cleanup);
  process.on('SIGBREAK', cleanup);
}

registerShutdownHooks();

const chromeArgs = [
  '--disable-gpu',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--window-size=1280,800',
];

if (isHeadless) {
  chromeArgs.push('--headless=new');
}

const baseCapabilities = isMac
  ? [
      {
        browserName: 'chrome',
        'goog:chromeOptions': {
          args: chromeArgs,
        },
      },
    ]
  : [
      {
        maxInstances: 1,
        'tauri:options': {
          application: resolveTauriBinary(),
        },
      },
    ];

export const config = {
  host: '127.0.0.1',
  port: driverPort,
  path: '/',
  specs: ['./specs/**/*.spec.ts'],
  logLevel: 'info',
  maxInstances: 1,
  automationProtocol: 'webdriver',
  services: [],
  baseUrl: isMac ? `http://127.0.0.1:${previewPort}` : undefined,
  capabilities: baseCapabilities,
  autoCompileOpts: {
    tsNodeOpts: {
      project: path.resolve(__dirname, 'tsconfig.json'),
      transpileOnly: true,
    },
  },
  reporters: ['spec'],
  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
  },
  before: isMac
    ? async () => {
        if (typeof browser !== 'undefined') {
          await browser.url('/');
        }
      }
    : undefined,
  onPrepare: async () => {
    if (isMac) {
      spawnSync('npm', ['run', 'build'], {
        cwd: projectRoot,
        stdio: 'inherit',
        shell: true,
      });

      await startChromeDriver();
      await startPreviewServer();
      return;
    }

    spawnSync('npm', ['run', 'tauri', 'build', '--', '--debug', '--no-bundle'], {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: true,
    });

    ensureBinaryExists(resolveTauriBinary());
  },
  beforeSession: isMac
    ? undefined
    : () => {
        const tauriDriverPath = resolveTauriDriver();

        if (!fs.existsSync(tauriDriverPath)) {
          throw new Error(
            `Could not find tauri-driver at "${tauriDriverPath}". ` +
              'Install it with "cargo install tauri-driver".'
          );
        }

        tauriDriverProcess = spawn(tauriDriverPath, [], {
          stdio: ['ignore', process.stdout, process.stderr],
        });

        tauriDriverProcess.on('error', (error) => {
          console.error('tauri-driver error:', error);
          process.exit(1);
        });

        tauriDriverProcess.on('exit', (code) => {
          if (!shuttingDown) {
            console.error('tauri-driver exited unexpectedly with code:', code);
            process.exit(code ?? 1);
          }
        });
      },
  afterSession: () => {
    if (isMac) {
      closePreviewServer();
      closeChromeDriver();
    } else {
      closeTauriDriver();
    }
  },
};
