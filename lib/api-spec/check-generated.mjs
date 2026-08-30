import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const generatedPaths = [
  "lib/api-client-react/src/generated",
  "lib/api-zod/src/generated",
];

let hasTrackedChanges = false;
try {
  await execFileAsync(
    "git",
    ["diff", "--quiet", "HEAD", "--", ...generatedPaths],
    {
      cwd: repositoryRoot,
    },
  );
} catch (error) {
  if (error?.code === 1) {
    hasTrackedChanges = true;
  } else {
    throw error;
  }
}

const { stdout: untrackedFiles } = await execFileAsync(
  "git",
  ["ls-files", "--others", "--exclude-standard", "--", ...generatedPaths],
  { cwd: repositoryRoot },
);

if (hasTrackedChanges || untrackedFiles.trim()) {
  console.error(
    "Generated API output is out of date with lib/api-spec/openapi.yaml.",
  );
  console.error(
    "Run `pnpm --filter @workspace/api-spec run codegen` and commit the generated files.",
  );
  process.exitCode = 1;
}
