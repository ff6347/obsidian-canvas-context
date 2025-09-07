module.exports = {
	extends: '@technologiestiftung/semantic-release-config',
	npmPublish: true,
	branches: [{ name: 'main' }, { name: 'beta', prerelease: true }],
};
