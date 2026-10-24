// Build "Memo-ry Receiver.app": the server compiled to one binary (no Bun needed to run it) inside a
// small menu-bar app (app/main.swift) that keeps it running and starts at login.
// `bun build-app.ts` builds into mac/build/; `bun build-app.ts --install` also copies it to ~/Applications and opens it.
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const APP_NAME = 'Memo-ry Receiver';
const BUNDLE_ID = 'com.tushar.memory.receiver';
const dir = import.meta.dir;
const build = join(dir, 'build');
const app = join(build, `${APP_NAME}.app`);

function run(cmd: string[]) {
  const res = Bun.spawnSync(cmd, { stdout: 'inherit', stderr: 'inherit', cwd: dir });
  if (res.exitCode !== 0) {
    console.error(`Failed: ${cmd.join(' ')}`);
    process.exit(1);
  }
}

rmSync(app, { recursive: true, force: true });
mkdirSync(join(app, 'Contents', 'MacOS'), { recursive: true });
mkdirSync(join(app, 'Contents', 'Resources'), { recursive: true });

run(['bun', 'build', '--compile', '--minify', 'server.ts', '--outfile', join(app, 'Contents', 'Resources', 'memo-ry-receiver')]);
for (const name of ['AppIcon.icns', 'menubar.png', 'menubar@2x.png']) cpSync(join(dir, 'app', 'Resources', name), join(app, 'Contents', 'Resources', name));
run(['swiftc', '-O', '-target', 'arm64-apple-macos13.0', 'app/main.swift', '-o', join(app, 'Contents', 'MacOS', 'MemoryReceiver')]);

writeFileSync(
  join(app, 'Contents', 'Info.plist'),
  `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>${APP_NAME}</string>
  <key>CFBundleDisplayName</key><string>${APP_NAME}</string>
  <key>CFBundleIdentifier</key><string>${BUNDLE_ID}</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>CFBundleExecutable</key><string>MemoryReceiver</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>LSMinimumSystemVersion</key><string>13.0</string>
  <key>LSUIElement</key><true/>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
`,
);

// Ad-hoc signature: enough for this Mac (login items and the firewall prompt need a stable identity).
run(['codesign', '--force', '--deep', '--sign', '-', '--identifier', BUNDLE_ID, app]);
console.log(`Built ${app}`);

if (process.argv.includes('--install')) {
  const dest = join(homedir(), 'Applications', `${APP_NAME}.app`);
  Bun.spawnSync(['pkill', '-x', 'MemoryReceiver']);
  Bun.spawnSync(['pkill', '-x', 'memo-ry-receiver']);
  Bun.sleepSync(1000);
  mkdirSync(join(homedir(), 'Applications'), { recursive: true });
  rmSync(dest, { recursive: true, force: true });
  cpSync(app, dest, { recursive: true, verbatimSymlinks: true });
  Bun.sleepSync(500);
  run(['open', dest]);
  console.log(`Installed ${dest}. It is in the menu bar (Memo-ry icon) and starts at login.`);
}
