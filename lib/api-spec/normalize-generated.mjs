import { readFile, writeFile } from "node:fs/promises";

// Orval gives a path-parameter schema and the query type the same name when
// an operation has both. Keep the generated query type available without
// colliding with the path schema exported by generated/api.ts.
const path = new URL("../api-zod/src/generated/types/getHotelAvailabilityParams.ts", import.meta.url);
const index = new URL("../api-zod/src/generated/types/index.ts", import.meta.url);
const zodApi = new URL("../api-zod/src/generated/api.ts", import.meta.url);
const reviewQueryType = new URL("../api-zod/src/generated/types/listHotelReviewsForHotelParams.ts", import.meta.url);
const reviewTypesIndex = new URL("../api-zod/src/generated/types/index.ts", import.meta.url);

for (const file of [path, index]) {
  const content = await readFile(file, "utf8");
  await writeFile(file, content.replaceAll("GetHotelAvailabilityParams", "GetHotelAvailabilityInput"));
}

for (const file of [reviewQueryType, reviewTypesIndex]) {
  const content = await readFile(file, "utf8");
  await writeFile(file, content.replaceAll("ListHotelReviewsForHotelParams", "ListHotelReviewsForHotelQueryInput"));
}

// Orval's current Zod emitter uses the Zod 4 top-level helpers for integer and
// email constraints, while this workspace intentionally remains on Zod 3.
const zodApiContent = await readFile(zodApi, "utf8");
await writeFile(
  zodApi,
  zodApiContent
    .replaceAll("zod.int()", "zod.number().int()")
    .replaceAll("zod.email()", "zod.string().email()")
    .replaceAll("zod.uuid()", "zod.string().uuid()")
    .replaceAll("zod.url()", "zod.string().url()"),
);