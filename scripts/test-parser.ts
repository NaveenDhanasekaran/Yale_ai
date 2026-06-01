// Run: node scripts/test-parser.ts
import { readFileSync } from "node:fs";
import { parseYaleCallLog } from "../lib/yaleEmail.ts";

const sample = readFileSync(new URL("./sample-calllog.txt", import.meta.url), "utf8");
const parsed = parseYaleCallLog(sample);
console.log(JSON.stringify(parsed, null, 2));
