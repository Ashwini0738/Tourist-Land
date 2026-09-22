const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const nodeTest = require('node:test');

const { createServer, isPathInside, resolveContainedPath } = require('./serve');

const test =
  process.env.JEST_WORKER_ID === undefined ? nodeTest.test : global.test;

function request(server, requestPath, headers = {}) {
  const address = server.address();
  return new Promise((resolve, reject) => {
    const request = http.get(
      {
        host: '127.0.0.1',
        port: address.port,
        path: requestPath,
        headers,
      },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          resolve({
            body: Buffer.concat(chunks).toString('utf8'),
            headers: response.headers,
            statusCode: response.statusCode,
          });
        });
      },
    );
    request.on('error', reject);
  });
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

test('resolves normal static assets and manifests inside the static root', () => {
  const staticRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'travel-land-static-'));
  fs.mkdirSync(path.join(staticRoot, 'assets'), { recursive: true });
  fs.mkdirSync(path.join(staticRoot, 'ios'));
  fs.mkdirSync(path.join(staticRoot, 'android'));
  fs.writeFileSync(path.join(staticRoot, 'assets', 'app.js'), 'asset');
  fs.writeFileSync(path.join(staticRoot, 'ios', 'manifest.json'), '{}');
  fs.writeFileSync(path.join(staticRoot, 'android', 'manifest.json'), '{}');

  assert.equal(
    resolveContainedPath(staticRoot, '/assets/app.js'),
    path.join(staticRoot, 'assets', 'app.js'),
  );
  assert.equal(
    resolveContainedPath(staticRoot, 'ios', 'manifest.json'),
    path.join(staticRoot, 'ios', 'manifest.json'),
  );
  assert.equal(
    resolveContainedPath(staticRoot, 'android', 'manifest.json'),
    path.join(staticRoot, 'android', 'manifest.json'),
  );
});

test('serves valid assets and platform manifests without exposing filesystem paths', async () => {
  const staticRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'travel-land-http-'));
  fs.mkdirSync(path.join(staticRoot, 'assets'), { recursive: true });
  fs.mkdirSync(path.join(staticRoot, 'ios'));
  fs.mkdirSync(path.join(staticRoot, 'android'));
  fs.writeFileSync(path.join(staticRoot, 'assets', 'app.js'), 'asset');
  fs.writeFileSync(path.join(staticRoot, 'ios', 'manifest.json'), '{"platform":"ios"}');
  fs.writeFileSync(
    path.join(staticRoot, 'android', 'manifest.json'),
    '{"platform":"android"}',
  );

  const server = createServer({
    appName: 'Test App',
    landingPageTemplate: '<html>Test App</html>',
    requestBasePath: '',
    staticRoot,
  });
  await listen(server);

  try {
    const asset = await request(server, '/assets/app.js');
    assert.equal(asset.statusCode, 200);
    assert.equal(asset.body, 'asset');

    const iosManifest = await request(server, '/manifest', {
      'expo-platform': 'ios',
    });
    assert.equal(iosManifest.statusCode, 200);
    assert.equal(iosManifest.body, '{"platform":"ios"}');

    const androidManifest = await request(server, '/', {
      'expo-platform': 'android',
    });
    assert.equal(androidManifest.statusCode, 200);
    assert.equal(androidManifest.body, '{"platform":"android"}');

    for (const hostilePath of [
      '/%2e%2e/package.json',
      '/%2e%2e%2fpackage.json',
      '/C:%5cWindows%5cwin.ini',
      '/%E0%A4%A',
    ]) {
      const response = await request(server, hostilePath);
      assert.equal(response.statusCode, 404, hostilePath);
      assert.equal(response.body, 'Not Found', hostilePath);
      assert.equal(response.body.includes(staticRoot), false, hostilePath);
    }

    const invalidPlatform = await request(server, '/manifest', {
      'expo-platform': 'windows',
    });
    assert.equal(invalidPlatform.statusCode, 404);
    assert.equal(invalidPlatform.body, 'Not Found');
  } finally {
    await close(server);
  }
});

test('rejects traversal, encoded traversal, absolute paths, and malformed paths', () => {
  const staticRoot = '/tmp/travel-land-static-root';
  const rejectedPaths = [
    '../secret.txt',
    '../../secret.txt',
    '/%2e%2e/secret.txt',
    '/%2e%2e%2fsecret.txt',
    'C:/Windows/win.ini',
    '/C:%5cWindows%5cwin.ini',
    '/..%5c..%5csecret.txt',
    '/%E0%A4%A',
  ];

  for (const requestedPath of rejectedPaths) {
    assert.equal(
      resolveContainedPath(staticRoot, requestedPath),
      null,
      requestedPath,
    );
  }
});

test('uses a path-separator-aware root containment check', () => {
  assert.equal(
    resolveContainedPath('/tmp/static-build', '/-shadow/file.js'),
    '/tmp/static-build/-shadow/file.js',
  );
  assert.equal(
    isPathInside('/tmp/static-build', '/tmp/static-build-evil/file.js'),
    false,
  );
});