#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import Mustache from 'mustache';

import { renderBootTemplate } from './render-boot-template.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const nodeBinExt = process.platform === 'win32' ? '.cmd' : '';

function resolveBin(name) {
  return path.join(projectRoot, 'node_modules', '.bin', `${name}${nodeBinExt}`);
}

function runCommand(
  command,
  args,
  { cwd = projectRoot, stdio = 'inherit' } = {},
) {
  const useShell =
    process.platform === 'win32' && /\.(cmd|bat)$/i.test(command);
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio, shell: useShell });
    let capturedStdout = '';
    let capturedStderr = '';

    if (child.stdout) {
      child.stdout.on('data', chunk => {
        capturedStdout += chunk.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on('data', chunk => {
        capturedStderr += chunk.toString();
      });
    }

    child.on('close', code => {
      if (code === 0) {
        resolve({ stdout: capturedStdout, stderr: capturedStderr });
      } else {
        const error = new Error(
          `Command failed: ${command} ${args.join(' ')}\n${capturedStderr}`,
        );
        error.code = code;
        reject(error);
      }
    });
  });
}

async function runNodeScript(scriptRelativePath, scriptArgs = []) {
  const scriptPath = path.join(projectRoot, scriptRelativePath);
  const { stdout } = await runCommand(
    process.execPath,
    [scriptPath, ...scriptArgs],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  return stdout.trim();
}

async function writeJSON(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function copyDirectory(from, to) {
  await fs.rm(to, { recursive: true, force: true });
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.cp(from, to, { recursive: true });
}

async function copyFile(from, to) {
  await fs.mkdir(path.dirname(to), { recursive: true });
  await fs.copyFile(from, to);
}

export async function buildExtension({ settingsPath } = {}) {
  const effectiveSettingsPath =
    settingsPath ?? path.join('settings', 'chrome-dev.json');
  const absoluteSettingsPath = path.isAbsolute(effectiveSettingsPath)
    ? effectiveSettingsPath
    : path.join(projectRoot, effectiveSettingsPath);
  const buildDir = path.join(projectRoot, 'build');
  const srcDir = path.join(projectRoot, 'src');
  const clientDir = path.join(buildDir, 'client');

  await fs.mkdir(buildDir, { recursive: true });

  const settingsJSON = await runNodeScript('tools/settings.js', [
    path.relative(projectRoot, absoluteSettingsPath),
  ]);
  const settings = JSON.parse(settingsJSON);
  const settingsOutputPath = path.join(buildDir, 'settings.json');
  await writeJSON(settingsOutputPath, settings);

  const rollupBin = resolveBin('rollup');
  await runCommand(rollupBin, ['-c', 'rollup.config.js']);

  const manifestTemplate = await fs.readFile(
    path.join(srcDir, 'manifest.json.mustache'),
    'utf8',
  );
  const manifest = Mustache.render(manifestTemplate, settings);
  await fs.writeFile(path.join(buildDir, 'manifest.json'), manifest, 'utf8');

  const hypothesisBuildSource = path.join(
    projectRoot,
    'node_modules',
    'hypothesis',
    'build',
  );
  const hypothesisBuildTarget = path.join(clientDir, 'build');
  await copyDirectory(hypothesisBuildSource, hypothesisBuildTarget);

  const bootTemplatePath = path.join(hypothesisBuildTarget, 'boot-template.js');
  const bootScriptPath = path.join(hypothesisBuildTarget, 'boot.js');
  renderBootTemplate(bootTemplatePath, bootScriptPath);
  await fs.rm(bootTemplatePath, { force: true });
  await fs.rm(path.join(hypothesisBuildTarget, 'manifest.json'), {
    force: true,
  });

  const templateContextJSON = await runNodeScript(
    'tools/template-context-app.js',
    [path.relative(projectRoot, path.join(buildDir, 'settings.json'))],
  );
  const templateContext = JSON.parse(templateContextJSON);
  const sidebarTemplate = await fs.readFile(
    path.join(srcDir, 'sidebar-app.html.mustache'),
    'utf8',
  );
  const appHtml = Mustache.render(sidebarTemplate, templateContext);
  const appHtmlPath = path.join(clientDir, 'app.html');
  await fs.writeFile(appHtmlPath, appHtml, 'utf8');
  await copyFile(appHtmlPath, path.join(clientDir, 'notebook.html'));
  await copyFile(appHtmlPath, path.join(clientDir, 'profile.html'));

  await copyFile(
    path.join(srcDir, 'unload-client.js'),
    path.join(buildDir, 'unload-client.js'),
  );
  await copyFile(
    path.join(srcDir, 'pdfjs-init.js'),
    path.join(buildDir, 'pdfjs-init.js'),
  );
  await copyDirectory(
    path.join(srcDir, 'vendor', 'pdfjs'),
    path.join(buildDir, 'pdfjs'),
  );

  for (const dirName of ['help', 'images', 'options']) {
    await copyDirectory(
      path.join(srcDir, dirName),
      path.join(buildDir, dirName),
    );
  }
}

function parseArgs(argv) {
  const args = { settingsPath: undefined };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if ((value === '--settings' || value === '-s') && index + 1 < argv.length) {
      args.settingsPath = argv[index + 1];
      index += 1;
      continue;
    }
  }
  return args;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  buildExtension(args).catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
