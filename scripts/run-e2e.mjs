import { readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const generatedFiles = ["next-env.d.ts", "tsconfig.json"];
const originals = new Map(await Promise.all(generatedFiles.map(async (file) => [file, await readFile(file)])));

let exitCode = 1;
try {
  const child = spawn("pnpm", ["exec", "playwright", "test", ...process.argv.slice(2)], {
    stdio: "inherit",
    env: process.env,
  });
  exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve(signal ? 1 : (code ?? 1)));
  });
} finally {
  await Promise.all([...originals].map(([file, contents]) => writeFile(file, contents)));
}
process.exitCode = exitCode;
