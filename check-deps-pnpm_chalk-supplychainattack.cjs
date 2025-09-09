// Checks to see if any node js depednencies were impacted by the hack described here:
// https://www.aikido.dev/blog/npm-debug-and-chalk-packages-compromised
// To use - simply save as  check-compromised.js next to your pnpm-lock.yaml file, then run
// node check-compromised.js
const fs = require("fs");

const compromised = {
	"ansi-styles": "6.2.2",
	debug: "4.4.2",
	chalk: "5.6.1",
	"supports-color": "10.2.1",
	"strip-ansi": "7.1.1",
	"ansi-regex": "6.2.1",
	"wrap-ansi": "9.0.1",
	"color-convert": "3.1.1",
	"color-name": "2.0.1",
	"is-arrayish": "0.3.3",
	"slice-ansi": "7.1.1",
	color: "5.0.1",
	"color-string": "2.1.1",
	"simple-swizzle": "0.2.3",
	"supports-hyperlinks": "4.1.1",
	"has-ansi": "6.0.1",
	"chalk-template": "1.1.1",
	backslash: "0.2.1",
};

function checkDependencies() {
	if (!fs.existsSync("pnpm-lock.yaml")) {
		console.error("❌ Could not find pnpm-lock.yaml");
		process.exit(1);
	}

	const content = fs.readFileSync("pnpm-lock.yaml", "utf8");
	const matches = [];

	// Simple regex to find package entries and versions
	const packageRegex = /^\s+([^:]+)@([^:]+):/gm;
	let match;

	while ((match = packageRegex.exec(content)) !== null) {
		const name = match[1];
		const version = match[2];

		if (compromised[name] && version.startsWith(compromised[name])) {
			matches.push({ name, version });
		}
	}

	if (matches.length === 0) {
		console.log("✅ No compromised packages found.");
	} else {
		console.log("⚠️ Found compromised packages:");
		matches.forEach((m) => console.log(` - ${m.name}@${m.version}`));
	}
}

checkDependencies();
