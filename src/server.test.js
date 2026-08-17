import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { createApp } from './server.js';

describe('createApp', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = createApp().listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  });

  it('responds 200 with service metadata', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.service, 'pdm-finance-delivery');
    assert.equal(body.status, 'ok');
    assert.equal(body.path, '/health');
  });
});