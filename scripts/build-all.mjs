import { spawnSync } from 'node:child_process';

const workspaces = ['packages/core', 'packages/mcp-server', 'packages/web'];

for (const workspace of workspaces) {
  const command = ['npm', 'run', 'build', `--workspace=${workspace}`];
  const spawnCommand = process.platform === 'win32' ? 'cmd.exe' : 'npm';
  const spawnArgs = process.platform === 'win32'
    ? ['/d', '/s', '/c', command.join(' ')]
    : command.slice(1);

  const result = spawnSync(
    spawnCommand,
    spawnArgs,
    { stdio: 'inherit', shell: false },
  );

  if (result.error) {
    console.error(`Failed to start build for ${workspace}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`Build failed for ${workspace} with exit code ${result.status}.`);
    process.exit(result.status ?? 1);
  }
}
