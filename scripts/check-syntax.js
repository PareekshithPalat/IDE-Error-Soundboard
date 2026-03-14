const fs = require("fs");
const path = require("path");

const files = [
  "src/extension.js",
  "src/shared/config.js",
  "src/shared/audio.js",
  "src/shared/detector.js",
  "bin/soundboard.js"
];

for (const relativePath of files) {
  const absolutePath = path.join(__dirname, "..", relativePath);
  try {
    // This throws on invalid JavaScript syntax.
    const source = fs.readFileSync(absolutePath, "utf8").replace(/^#!.*\r?\n/, "");
    new Function(source);
    console.log(`OK ${relativePath}`);
  } catch (error) {
    console.error(`FAIL ${relativePath}`);
    console.error(error.message);
    process.exitCode = 1;
  }
}
