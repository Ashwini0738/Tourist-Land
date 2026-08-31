import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import http from "node:http";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import express, { type RequestHandler } from "express";
import { assertSafeDemoEnvironment } from "@workspace/db/demo-config";

const execFileAsync = promisify(execFile);
const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const databaseUrl = process.env.DEMO_E2E_DATABASE_URL;

if (databaseUrl) {
  process.env.DATABASE_URL = databaseUrl;
  process.env.DEMO_MODE = "true";
  process.env.NODE_ENV = "test";
}

function testEnvironment() {
  if (!databaseUrl)
    return {
      skip: "Set DEMO_E2E_DATABASE_URL to a disposable local Postgres database.",
    };
  assertSafeDemoEnvironment(
    {
      ...process.env,
      DATABASE_URL: databaseUrl,
      DEMO_MODE: "true",
      NODE_ENV: "test",
    },
    "report export e2e test",
  );
  return {};
}

async function runFixtureCommand(action: "seed" | "reset") {
  if (!databaseUrl) throw new Error("DEMO_E2E_DATABASE_URL is required.");
  await execFileAsync(
    "pnpm",
    ["--filter", "@workspace/scripts", `report-export:${action}`],
    {
      cwd: workspaceRoot,
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        DEMO_MODE: "true",
        NODE_ENV: "test",
      },
      maxBuffer: 2_000_000,
    },
  );
}

type TestServer = {
  baseUrl: string;
  close: () => Promise<void>;
};

async function startTestServer(
  options: { afterFirstExportChunk?: () => void } = {},
): Promise<TestServer> {
  process.env.DATABASE_URL = databaseUrl;
  process.env.DEMO_MODE = "true";
  process.env.NODE_ENV = "test";
  const { createReportsRouter } = await import("./reports.ts");

  const authenticateFixtureUser: RequestHandler = (req, res, next) => {
    const clerkUserId = req.get("x-demo-clerk-user");
    if (!clerkUserId) {
      res.status(401).json({
        error: {
          code: "UNAUTHENTICATED",
          message: "Test identity is required.",
        },
      });
      return;
    }
    req.localUser = {
      id: "report-export-admin",
      clerkUserId,
      email: "report-export-admin@example.test",
      displayName: "Report export admin",
      phone: null,
      avatarUrl: null,
      status: "active",
      role: "admin",
      createdAt: new Date("2030-01-15T12:34:56.789Z"),
      updatedAt: new Date("2030-01-15T12:34:56.789Z"),
    };
    next();
  };

  const app = express();
  app.use((req, res, next) => {
    if (
      options.afterFirstExportChunk &&
      req.path === "/v1/admin/reports/export"
    ) {
      const originalWrite = res.write.bind(res);
      let writeCount = 0;
      res.write = ((chunk: any, ...args: any[]) => {
        const result = originalWrite(chunk, ...args);
        writeCount += 1;
        if (writeCount === 2) options.afterFirstExportChunk?.();
        return result;
      }) as typeof res.write;
    }
    next();
  });
  app.use(createReportsRouter(authenticateFixtureUser));

  const server = http.createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Test server did not expose a TCP address.");
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

function fixtureId(group: string, n: number) {
  return `00000000-0000-4${group}-8000-${String(n).padStart(12, "0")}`;
}

function parseCsv(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      record.push(cell);
      cell = "";
    } else if (character === "\n") {
      record.push(cell);
      records.push(record);
      record = [];
      cell = "";
    } else if (character !== "\r") {
      cell += character;
    }
  }
  if (cell || record.length) {
    record.push(cell);
    records.push(record);
  }
  return records;
}

test(
  "report exports preserve filtered rows, CSV values, and interrupted streams",
  { skip: testEnvironment().skip },
  async (t) => {
    await runFixtureCommand("reset");
    await runFixtureCommand("seed");
    t.after(() => runFixtureCommand("reset"));

    const server = await startTestServer();
    t.after(() => server.close());
    const expected = {
      users: [
        fixtureId("901", 1),
        ...Array.from({ length: 1_001 }, (_, index) =>
          fixtureId("903", index + 1),
        ),
      ],
      bookings: Array.from({ length: 1_001 }, (_, index) =>
        fixtureId("904", index + 1),
      ),
      payments: Array.from({ length: 1_001 }, (_, index) =>
        fixtureId("905", index + 1),
      ),
      properties: Array.from({ length: 1_001 }, (_, index) =>
        fixtureId("906", index + 1),
      ),
      enquiries: Array.from({ length: 1_001 }, (_, index) =>
        fixtureId("907", index + 1),
      ),
    };
    const range = "from=2030-01-01&to=2030-01-31";

    async function exportRows(
      table: string,
      filters: string,
      expectedIds: readonly string[],
    ) {
      const response = await fetch(
        `${server.baseUrl}/v1/admin/reports/export?table=${table}&${range}&${filters}`,
        {
          headers: { "x-demo-clerk-user": "report_export_admin" },
        },
      );
      const body = await response.text();
      assert.equal(response.status, 200, body.slice(0, 200));
      assert.equal(
        response.headers.get("x-report-row-count"),
        String(expectedIds.length),
      );
      const rows = parseCsv(body);
      assert.equal(rows.length, expectedIds.length + 1);
      const ids = rows.slice(1).map((row) => row[0]);
      assert.equal(new Set(ids).size, expectedIds.length);
      assert.deepEqual(new Set(ids), new Set(expectedIds));
      return rows;
    }

    const bookingRows = await exportRows(
      "bookings",
      "status=confirmed&country=India",
      expected.bookings,
    );
    const bookingOne = bookingRows.find(
      (row) => row[0] === expected.bookings[0],
    );
    assert.ok(bookingOne);
    assert.equal(bookingOne[1], "REPORT-BOOKING-1");
    assert.equal(bookingOne[5], "10.5");
    assert.equal(bookingOne[6], "USD");
    assert.equal(bookingOne[8], "2030-01-15T12:34:56.789Z");
    assert.equal(bookingOne[3], "2030-01-20");

    const paymentRows = await exportRows(
      "payments",
      "status=paid",
      expected.payments,
    );
    const paymentOne = paymentRows.find(
      (row) => row[0] === expected.payments[0],
    );
    assert.ok(paymentOne);
    assert.equal(paymentOne[2], "10.5");
    assert.equal(paymentOne[3], "USD");
    assert.equal(paymentOne[6], "2030-01-15T12:34:56.789Z");

    const propertyRows = await exportRows(
      "properties",
      "status=published",
      expected.properties,
    );
    const propertyOne = propertyRows.find(
      (row) => row[0] === expected.properties[0],
    );
    assert.ok(propertyOne);
    assert.equal(propertyOne[1], 'Villa, "quoted"\nline');
    assert.equal(propertyOne[4], "10.5");
    assert.equal(propertyOne[6], "2030-01-15T12:34:56.789Z");

    const enquiryRows = await exportRows(
      "enquiries",
      "status=closed",
      expected.enquiries,
    );
    const enquiryOne = enquiryRows.find(
      (row) => row[0] === expected.enquiries[0],
    );
    assert.ok(enquiryOne);
    assert.equal(enquiryOne[1], 'Villa, "quoted"\nline');
    assert.equal(enquiryOne[3], "2030-01-15T12:34:56.789Z");

    const vendorRows = await exportRows(
      "vendors",
      "status=approved&country=India",
      expected.users.slice(1),
    );
    const vendorOne = vendorRows.find((row) => row[0] === expected.users[1]);
    assert.ok(vendorOne);
    assert.equal(vendorOne[1], 'Vendor, "quoted"');
    assert.equal(vendorOne[2], "India");
    assert.equal(vendorOne[6], "2030-01-15T12:34:56.789Z");

    const { pool } = await import("@workspace/db");
    const interruptedServer = await startTestServer({
      afterFirstExportChunk: () => {
        void pool.end().catch(() => undefined);
      },
    });
    t.after(() => interruptedServer.close());
    let interrupted = false;
    try {
      const response = await fetch(
        `${interruptedServer.baseUrl}/v1/admin/reports/export?table=bookings&${range}&status=confirmed&country=India`,
        {
          headers: { "x-demo-clerk-user": "report_export_admin" },
        },
      );
      assert.equal(response.status, 200);
      await response.text();
    } catch {
      interrupted = true;
    }
    assert.equal(
      interrupted,
      true,
      "a later-page database failure must interrupt the CSV response",
    );
  },
);
