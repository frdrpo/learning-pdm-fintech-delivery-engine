import { createServer } from 'node:http';

export function createApp() {
  return createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        service: 'pdm-finance-delivery',
        path: req.url,
        status: 'ok',
      })
    );
  });
}