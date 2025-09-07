module.exports = {
	extends: "@technologiestiftung/semantic-release-config",
	npmPublish: false,
	branches: [{ name: "main" }, { name: "beta", prerelease: true }],
	plugins: [
		"@semantic-release/commit-analyzer",
		"@semantic-release/release-notes-generator",
		"@semantic-release/changelog",
		[
			"@semantic-release/github",
			{
				assets: [
					"main.js",
					"manifest.json",
					"styles.css",
					"versions.json"
				]
			}
		]
	]
};
