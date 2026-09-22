/**
 * Standalone production server for Expo static builds.
 *
 * Serves the output of build.js (static-build/) with two special routes:
 * - GET / or /manifest with expo-platform header → platform manifest JSON
 * - GET / without expo-platform → landing page HTML
 * Everything else falls through to static file serving from ./static-build/.
 *
 * Zero external dependencies — uses only Node.js built-ins (http, fs, path).
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const STATIC_ROOT = path.resolve(__dirname, '..', 'static-build');
const TEMPLATE_PATH = path.resolve(__dirname, 'templates', 'landing-page.html');
const basePath = (process.env.BASE_PATH || '/').replace(/\/+$/, '');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.map': 'application/json',
};

function getAppName() {
  try {
    const appJsonPath = path.resolve(__dirname, '..', 'app.json');
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
    return typeof appJson.expo?.name === 'string'
      ? appJson.expo.name
      : 'App Landing Page';
  } catch {
    return 'App Landing Page';
  }
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function decodePathSegment(value) {
  try {
    const decoded = decodeURIComponent(value);
    return decoded.includes('\0') ? null : decoded;
  } catch {
    return null;
  }
}

function isPathInside(rootPath, candidatePath) {
  const resolvedRoot = path.resolve(rootPath);
  const resolvedCandidate = path.resolve(candidatePath);
  return (
    resolvedCandidate === resolvedRoot ||
    resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`)
  );
}

function resolveContainedPath(rootPath, ...segments) {
  const decodedSegments = segments.map(decodePathSegment);
  if (decodedSegments.some((segment) => segment === null)) {
    return null;
  }

  const normalizedPath = decodedSegments
    .join('/')
    .replaceAll('\\', '/');

  // A request path may have one leading slash, but multiple leading slashes
  // and Windows drive paths are absolute-path injection attempts.
  if (normalizedPath.startsWith('//')) {
    return null;
  }

  const relativePath = normalizedPath.replace(/^\/+/, '');
  if (path.win32.isAbsolute(relativePath)) {
    return null;
  }

  const resolvedPath = path.resolve(rootPath, relativePath);
  return isPathInside(rootPath, resolvedPath) ? resolvedPath : null;
}

function sendNotFound(res) {
  res.writeHead(404);
  res.end('Not Found');
}

function toScriptString(value) {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026');
}

function serveManifest(platform, res, staticRoot = STATIC_ROOT) {
  const manifestPath = resolveContainedPath(
    staticRoot,
    platform,
    'manifest.json',
  );

  if (!manifestPath) {
    sendNotFound(res);
    return;
  }

  let manifest;
  try {
    manifest = fs.readFileSync(manifestPath, 'utf-8');
  } catch {
    sendNotFound(res);
    return;
  }

  res.writeHead(200, {
    'content-type': 'application/json',
    'expo-protocol-version': '1',
    'expo-sfv-version': '0',
  });
  res.end(manifest);
}

function serveLandingPage(req, res, landingPageTemplate, appName) {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const protocol = forwardedProto || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers['host'];
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `exps://${host}${basePath}`;

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_ATTRIBUTE_PLACEHOLDER/g, escapeHtml(expsUrl))
    .replace(/EXPS_URL_JSON_PLACEHOLDER/g, toScriptString(expsUrl))
    .replace(/APP_NAME_PLACEHOLDER/g, escapeHtml(appName));

  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
}

function serveStaticFile(urlPath, res, staticRoot = STATIC_ROOT) {
  const filePath = resolveContainedPath(staticRoot, urlPath);
  if (!filePath) {
    sendNotFound(res);
    return;
  }

  try {
    if (fs.statSync(filePath).isDirectory()) {
      sendNotFound(res);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'content-type': contentType });
    res.end(content);
  } catch {
    sendNotFound(res);
  }
}

function createServer({
  staticRoot = STATIC_ROOT,
  landingPageTemplate = fs.readFileSync(TEMPLATE_PATH, 'utf-8'),
  appName = getAppName(),
  requestBasePath = basePath,
} = {}) {
  return http.createServer((req, res) => {
    let url;
    try {
      url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    } catch {
      res.writeHead(400);
      res.end('Bad Request');
      return;
    }

    let pathname = url.pathname;

    if (requestBasePath && pathname.startsWith(requestBasePath)) {
      pathname = pathname.slice(requestBasePath.length) || '/';
    }

    if (pathname === '/' || pathname === '/manifest') {
      const platform = req.headers['expo-platform'];
      if (platform === 'ios' || platform === 'android') {
        return serveManifest(platform, res, staticRoot);
      }

      if (pathname === '/') {
        return serveLandingPage(req, res, landingPageTemplate, appName);
      }
    }

    serveStaticFile(pathname, res, staticRoot);
  });
}

if (require.main === module) {
  const server = createServer();
  const port = parseInt(process.env.PORT || '3000', 10);
  server.listen(port, '0.0.0.0', () => {
    console.log(`Serving static Expo build on port ${port}`);
  });
}

module.exports = {
  createServer,
  isPathInside,
  resolveContainedPath,
};
