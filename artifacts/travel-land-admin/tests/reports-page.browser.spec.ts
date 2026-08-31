import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { once } from 'node:events';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
);
const adminBasePath = '/admin-portal/';
const exportPath = '/v1/admin/reports/export';
const reportPath = '/v1/admin/reports';
const csv = [
  'id,amount,currency,status,createdAt',
  'payment-1,10.5,USD,paid,2030-01-15T12:34:56.789Z',
  '',
].join('\n');

let apiServer: Server;
let apiBaseUrl: string;
let viteProcess: ChildProcess;
let adminBaseUrl: string;
const exportQueries: URL[] = [];
let streamAttempt = 0;

function listen(server: Server): Promise<string> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Test server did not expose a TCP address.'));
        return;
      }
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

function reportPayload() {
  const emptyMeta = { page: 1, limit: 10, total: 0, hasMore: false };
  return {
    source: 'database',
    provenance: 'live',
    timezone: 'UTC',
    generatedAt: '2030-01-15T12:34:56.789Z',
    range: { from: '2030-01-01', to: '2030-01-31' },
    filters: { country: 'India' },
    unavailable: [],
    kpis: { payments: 1 },
    breakdowns: { bookings: [], payments: [], enquiries: [], reviewRatings: [], roles: [], hotelsByCountry: [] },
    currencies: { bookings: [], payments: [] },
    trends: [],
    tables: {
      bookings: [],
      payments: [{
        id: 'payment-1',
        bookingId: 'booking-1',
        amount: 10.5,
        currency: 'USD',
        status: 'paid',
        provider: 'stripe',
        createdAt: '2030-01-15T12:34:56.789Z',
      }],
      properties: [],
      enquiries: [],
      vendors: [],
    },
    meta: {
      bookings: emptyMeta,
      payments: { page: 1, limit: 10, total: 1, hasMore: false },
      properties: emptyMeta,
      enquiries: emptyMeta,
      vendors: emptyMeta,
    },
    supportedFilters: { countries: ['India'], statuses: ['confirmed', 'paid'] },
  };
}

function setCorsHeaders(request: IncomingMessage, response: ServerResponse) {
  const origin = request.headers.origin;
  if (origin) {
    response.setHeader('access-control-allow-origin', origin);
    response.setHeader('access-control-allow-credentials', 'true');
    response.setHeader('access-control-expose-headers', 'x-report-row-count');
  }
}

function writeJson(request: IncomingMessage, response: ServerResponse, payload: unknown) {
  const body = JSON.stringify(payload);
  setCorsHeaders(request, response);
  response.writeHead(200, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(body),
  });
  response.end(body);
}

function handleApiRequest(request: IncomingMessage, response: ServerResponse) {
  const requestUrl = new URL(request.url ?? '/', apiBaseUrl);
  if (request.method === 'OPTIONS') {
    setCorsHeaders(request, response);
    response.writeHead(204, {
      'access-control-allow-methods': 'GET, HEAD, OPTIONS',
      'access-control-allow-headers': 'content-type',
    });
    response.end();
    return;
  }
  if (requestUrl.pathname === reportPath && request.method === 'GET') {
    writeJson(request, response, reportPayload());
    return;
  }
  if (requestUrl.pathname !== exportPath) {
    response.writeHead(404);
    response.end();
    return;
  }

  exportQueries.push(requestUrl);
  if (request.method === 'HEAD') {
    setCorsHeaders(request, response);
    response.writeHead(200, {
      'x-report-row-count': '1',
      'content-type': 'text/csv',
    });
    response.end();
    return;
  }
  if (request.method !== 'GET') {
    response.writeHead(405);
    response.end();
    return;
  }

  streamAttempt += 1;
  setCorsHeaders(request, response);
  response.writeHead(200, {
    'content-type': 'text/csv; charset=utf-8',
    'content-length': Buffer.byteLength(csv),
  });
  if (streamAttempt === 1) {
    response.write(csv.slice(0, csv.indexOf('\n') + 8));
    setTimeout(() => response.socket?.destroy(), 25);
    return;
  }
  response.end(csv);
}

async function waitForUrl(url: string) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Vite may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function installFileWriter(page: Page, apiOrigin: string) {
  await page.addInitScript((origin) => {
    const browserFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const requestUrl = typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString();
      if (requestUrl.startsWith('/api/')) {
        return browserFetch(`${origin}${requestUrl.slice('/api'.length)}`, init);
      }
      return browserFetch(input, init);
    };

    const state = {
      aborted: false,
      partialCsv: '',
      savedCsv: '',
    };
    (window as Window & { __reportFileState?: typeof state }).__reportFileState = state;
    (window as Window & { showSaveFilePicker?: unknown }).showSaveFilePicker = async () => ({
      createWritable: async () => ({
        write: async (chunk: Uint8Array) => {
          state.partialCsv += new TextDecoder().decode(chunk);
        },
        close: async () => {
          state.savedCsv = state.partialCsv;
          state.partialCsv = '';
        },
        abort: async () => {
          state.aborted = true;
          state.partialCsv = '';
        },
      }),
    });
  }, apiOrigin);
}

test.beforeAll(async () => {
  streamAttempt = 0;
  exportQueries.length = 0;
  apiServer = createServer(handleApiRequest);
  apiBaseUrl = await listen(apiServer);

  const adminPortServer = createServer();
  const adminPortUrl = await listen(adminPortServer);
  await new Promise<void>((resolve, reject) => adminPortServer.close((error) => error ? reject(error) : resolve()));
  const adminPort = new URL(adminPortUrl).port;
  adminBaseUrl = `http://127.0.0.1:${adminPort}`;

  viteProcess = spawn(
    'pnpm',
    ['--filter', '@workspace/travel-land-admin', 'run', 'dev'],
    {
      cwd: workspaceRoot,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: adminPort,
        BASE_PATH: adminBasePath,
      },
      stdio: 'ignore',
    },
  );
  await waitForUrl(`${adminBaseUrl}${adminBasePath}tests/browser/report-export.html`);
});

test.afterAll(async () => {
  viteProcess?.kill('SIGTERM');
  if (viteProcess) await once(viteProcess, 'exit').catch(() => undefined);
  await new Promise<void>((resolve, reject) => apiServer.close((error) => error ? reject(error) : resolve()));
});

test('recovers an interrupted filtered CSV export in the same browser session', async ({ page }) => {
  await installFileWriter(page, apiBaseUrl);
  await page.goto(`${adminBaseUrl}${adminBasePath}tests/browser/report-export.html`);

  await page.getByTestId('text-report-provenance').waitFor();
  await page.getByTestId('input-report-from').fill('2030-01-01');
  await page.getByTestId('input-report-to').fill('2030-01-31');
  await page.getByTestId('select-report-country').selectOption('India');
  await page.getByTestId('select-report-status').selectOption('paid');
  await page.getByTestId('button-apply-report-range').click();
  await page.getByTestId('button-report-table-payments').click();

  await page.getByTestId('button-export-payments').click();
  const exportStatus = page.getByTestId('text-report-export-status');
  await assertText(exportStatus, 'The export download was interrupted before it finished. Try again.');
  await page.getByTestId('button-retry-report-export').waitFor();
  assert.equal(page.url(), `${adminBaseUrl}${adminBasePath}tests/browser/report-export.html`);

  const interruptedState = await page.evaluate(() => (window as unknown as Window & {
    __reportFileState: { aborted: boolean; partialCsv: string; savedCsv: string };
  }).__reportFileState);
  assert.equal(interruptedState.aborted, true);
  assert.equal(interruptedState.partialCsv, '');
  assert.equal(interruptedState.savedCsv, '');

  await page.getByTestId('button-retry-report-export').click();
  await assertText(exportStatus, 'Downloaded 1 payments from the server stream.');
  await page.waitForFunction(() => Boolean((window as unknown as Window & {
    __reportFileState: { savedCsv: string };
  }).__reportFileState.savedCsv));

  const savedCsv = await page.evaluate(() => (window as unknown as Window & {
    __reportFileState: { savedCsv: string };
  }).__reportFileState.savedCsv);
  assert.equal(savedCsv, csv);
  assert.deepEqual(
    exportQueries.map((query) => query.toString()),
    [
      `${apiBaseUrl}${exportPath}?from=2030-01-01&to=2030-01-31&country=India&status=paid&table=payments`,
      `${apiBaseUrl}${exportPath}?from=2030-01-01&to=2030-01-31&country=India&status=paid&table=payments`,
      `${apiBaseUrl}${exportPath}?from=2030-01-01&to=2030-01-31&country=India&status=paid&table=payments`,
      `${apiBaseUrl}${exportPath}?from=2030-01-01&to=2030-01-31&country=India&status=paid&table=payments`,
    ],
  );
});

async function assertText(locator: ReturnType<Page['getByTestId']>, expected: string) {
  await locator.waitFor();
  await expect(locator).toHaveText(expected);
}