import { readFile, writeFile } from "node:fs/promises";

// Orval gives a path-parameter schema and the query type the same name when
// an operation has both. Keep the generated query type available without
// colliding with the path schema exported by generated/api.ts.
const path = new URL("../api-zod/src/generated/types/getHotelAvailabilityParams.ts", import.meta.url);
const index = new URL("../api-zod/src/generated/types/index.ts", import.meta.url);

for (const file of [path, index]) {
  const content = await readFile(file, "utf8");
  await writeFile(file, content.replaceAll("GetHotelAvailabilityParams", "GetHotelAvailabilityInput"));
}