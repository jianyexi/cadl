#!/usr/bin/env node

import { readdirSync, rmdirSync } from "fs";
import mkdirp from "mkdirp";
import { dirname, join, normalize, resolve } from "path";
import { fileURLToPath } from "url";
import { run } from "../../../eng/scripts/helpers.js";

const excludedSamples = [
  // fails compilation by design to demo language server
  "local-cadl",

  // no actual samples in these dirs
  "node_modules",
  "scratch",
  "scripts",
  "test",
  ".rush",
];

const rootInputPath = resolvePath("../");
const rootOutputPath = resolvePath("../test/output");
main();

function main() {
  // clear any previous output as otherwise failing to emit anything could
  // escape PR validation. Also ensures we delete output for samples that
  // no longer exist.
  rmdirSync(rootOutputPath, { recursive: true });

  for (const folderName of getSampleFolders()) {
    const inputPath = join(rootInputPath, folderName);
    const outputPath = join(rootOutputPath, folderName);
    mkdirp(outputPath);

    run(process.execPath, [
      "../../packages/compiler/dist/core/cli.js",
      "compile",
      inputPath,
      `--output-path=${outputPath}`,
      `--emit=@cadl-lang/openapi3`,
      `--debug`,
    ]);
  }
}

function getSampleFolders() {
  const samples = new Set();
  const excludes = new Set(excludedSamples.map(normalize));
  walk("");
  return samples;

  function walk(relativeDir) {
    if (samples.has(relativeDir) || excludes.has(relativeDir)) {
      return;
    }
    const fullDir = join(rootInputPath, relativeDir);
    for (const entry of readdirSync(fullDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        walk(join(relativeDir, entry.name));
      } else if (relativeDir && (entry.name === "main.cadl" || entry.name === "package.json")) {
        samples.add(relativeDir);
      }
    }
  }
}

function resolvePath(...parts) {
  const dir = dirname(fileURLToPath(import.meta.url));
  return resolve(dir, ...parts);
}
