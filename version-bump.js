import { readFileSync, writeFileSync } from "fs";

const targetVersion = JSON.parse(readFileSync("package.json", "utf8"))[
	"version"
];

// read minAppVersion from manifest.json and bump version to target version
let manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));

// update versions.json with target version and minAppVersion from manifest.json
// only if minAppVersion has changed
let versions = JSON.parse(readFileSync("versions.json", "utf8"));
const existingMinAppVersions = Object.values(versions);
if (!existingMinAppVersions.includes(minAppVersion)) {
	versions[targetVersion] = minAppVersion;
	writeFileSync("versions.json", JSON.stringify(versions, null, "\t"));
}
