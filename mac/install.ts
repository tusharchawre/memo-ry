// Start the receiver at login with a launchd agent. `bun mac/install.ts` installs (or reinstalls),
// `bun mac/install.ts --uninstall` removes it. Logs: ~/Library/Logs/memo-ry-receiver.log.
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

import { DEFAULT_PORT, loadConfig } from './config';

const LABEL = 'com.tushar.memory.receiver';
const plistPath = join(homedir(), 'Library', 'LaunchAgents', `${LABEL}.plist`);
const logPath = join(homedir(), 'Library', 'Logs', 'memo-ry-receiver.log');
const domain = `gui/${process.getuid?.() ?? 501}`;

function launchctl(...args: string[]) {
  return Bun.spawnSync(['launchctl', ...args], { stderr: 'pipe', stdout: 'pipe' });
}

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

if (existsSync(plistPath)) launchctl('bootout', domain, plistPath);

if (process.argv.includes('--uninstall')) {
  rmSync(plistPath, { force: true });
  console.log('Memo-ry receiver removed. Your files in ~/Music/Memo-ry are untouched.');
  process.exit(0);
}

const config = loadConfig();
const server = resolve(import.meta.dir, 'server.ts');
const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array><string>${xml(process.execPath)}</string><string>${xml(server)}</string></array>
  <key>WorkingDirectory</key><string>${xml(import.meta.dir)}</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>${xml(logPath)}</string>
  <key>StandardErrorPath</key><string>${xml(logPath)}</string>
</dict>
</plist>
`;
mkdirSync(join(homedir(), 'Library', 'LaunchAgents'), { recursive: true });
writeFileSync(plistPath, plist);
const res = launchctl('bootstrap', domain, plistPath);
if (res.exitCode !== 0) {
  console.error(`launchctl bootstrap failed: ${res.stderr.toString().trim()}`);
  process.exit(1);
}
console.log(`Memo-ry receiver installed; it starts at login.`);
console.log(`Library: ~/Music/Memo-ry · port ${config.port ?? DEFAULT_PORT} · log ${logPath}`);
console.log(`Pair the phone: open http://localhost:${config.port}/pair`);
