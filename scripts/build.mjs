import { copyFile, mkdir } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
await copyFile('src/server.js', 'dist/app.js');
await copyFile('src/index.js', 'dist/index.js');
console.log('Built dist/app.js + dist/index.js');