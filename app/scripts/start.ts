import { config } from 'dotenv';
import { spawn } from 'node:child_process';

config(); // Load .env into process.env before spawning children

const services = [
  {
    name: 'web',
    color: '\x1b[36m', // cyan
    cmd: 'react-router-serve',
    args: ['./build/server/index.js'],
  },
  {
    name: 'watcher',
    color: '\x1b[35m', // magenta
    cmd: 'tsx',
    args: ['app/services/watcher.ts'],
  },
  {
    name: 'scheduler',
    color: '\x1b[33m', // yellow
    cmd: 'tsx',
    args: ['app/services/scheduler.ts'],
  },
];

const reset = '\x1b[0m';

const procs = services.map(({ name, color, cmd, args }) => {
  const proc = spawn(cmd, args, { stdio: 'pipe', shell: true });

  proc.stdout?.on('data', (d: Buffer) =>
    process.stdout.write(`${color}[${name}]${reset} ${d}`),
  );
  proc.stderr?.on('data', (d: Buffer) =>
    process.stderr.write(`${color}[${name}]${reset} ${d}`),
  );
  proc.on('exit', (code) => {
    console.log(`${color}[${name}]${reset} exited with code ${code}`);
    // Exit the parent process if any service dies unexpectedly
    if (code !== 0) process.exit(code ?? 1);
  });

  return proc;
});

process.on('SIGINT', () => {
  procs.forEach((p) => p.kill());
  process.exit(0);
});

process.on('SIGTERM', () => {
  procs.forEach((p) => p.kill());
  process.exit(0);
});
