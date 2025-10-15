# [1.2.0-beta.1](https://github.com/ff6347/obsidian-canvas-context/compare/v1.1.1-beta.4...v1.2.0-beta.1) (2025-10-15)


### Bug Fixes

* add non-null assertions to api-key-configuration-service tests ([681ff4b](https://github.com/ff6347/obsidian-canvas-context/commit/681ff4ba67137d4ef61f5ed6db26db1970cfb4b0))
* **canvas:** remove impossible fallback for canvas without file ([af7d4e0](https://github.com/ff6347/obsidian-canvas-context/commit/af7d4e0dc1e3b94f70afaa28c989be1b6b244cb3))
* correct message ordering in canvas walker for multi-system prompt chains ([897b441](https://github.com/ff6347/obsidian-canvas-context/commit/897b441a21cac3499fe0b37e2b4a8fb43d64b52b)), closes [#63](https://github.com/ff6347/obsidian-canvas-context/issues/63)
* integrate UINotificationAdapter into CanvasService ([74c17fa](https://github.com/ff6347/obsidian-canvas-context/commit/74c17fa690dcdd37e96c0f3140d3e04374d15a83)), closes [#66](https://github.com/ff6347/obsidian-canvas-context/issues/66) [#66](https://github.com/ff6347/obsidian-canvas-context/issues/66)
* position horizontal context nodes below their connected parent nodes ([73fea60](https://github.com/ff6347/obsidian-canvas-context/commit/73fea6064c0c3d1a28fdfd4e17017b1ea9cb57e4)), closes [#64](https://github.com/ff6347/obsidian-canvas-context/issues/64)


### Features

* add service infrastructure with CanvasContextSettings export ([5b89340](https://github.com/ff6347/obsidian-canvas-context/commit/5b8934060cac821c53a297e3867069809bfc3fb7))
* extract ApiKeyConfigurationService for API key management ([613321e](https://github.com/ff6347/obsidian-canvas-context/commit/613321e3c1c0a2f1c00d256698994f7070de0238))
* extract CanvasService for canvas operations ([683d01c](https://github.com/ff6347/obsidian-canvas-context/commit/683d01ce0bdd415383fa1c656fad6ed05f8db234))
* extract InferenceService for LLM operations ([4bda7a1](https://github.com/ff6347/obsidian-canvas-context/commit/4bda7a1f5a83a52f0325fd4de16be2e4c129db09))
* extract MenuService for canvas menu management ([c0e35a9](https://github.com/ff6347/obsidian-canvas-context/commit/c0e35a9705c416d420e83910d67554733a7a6f27))
* extract ModelConfigService for configuration management and persistence ([ddec2b0](https://github.com/ff6347/obsidian-canvas-context/commit/ddec2b041b02e25979f13498b24084ad883e13ba))
* extract ModelConfigurationService for settings UI management ([83ee891](https://github.com/ff6347/obsidian-canvas-context/commit/83ee891c1ca440b923508c5646937c497a416ad2))
* extract ModelFormService for UI state management and form rendering ([68331f1](https://github.com/ff6347/obsidian-canvas-context/commit/68331f1d5316bf72bd3015cdcff55534855342bc))
* extract ModelValidationService for form validation and connection testing ([e2c10a2](https://github.com/ff6347/obsidian-canvas-context/commit/e2c10a2c8db4c1cc6b4a5b49ee4c32d35d082100))
* extract pure menu logic functions ([a8fa646](https://github.com/ff6347/obsidian-canvas-context/commit/a8fa646de576c8d14304175cfaba426c51de5945))
* extract SettingsUIService for settings layout coordination ([404cb43](https://github.com/ff6347/obsidian-canvas-context/commit/404cb43a855e9b978d9e1d5a36b0325ef63247f6))
* extract StatusService for status bar management ([ccd1701](https://github.com/ff6347/obsidian-canvas-context/commit/ccd1701b16cf3a506901d1670361f52a06ae824e))
* Implement adapter pattern for Obsidian API decoupling ([b29abe0](https://github.com/ff6347/obsidian-canvas-context/commit/b29abe094f41b9000dba1b6f26704b6f0369db0e)), closes [#55](https://github.com/ff6347/obsidian-canvas-context/issues/55) [-#57](https://github.com/-/issues/57)

## [1.1.1-beta.4](https://github.com/ff6347/obsidian-canvas-context/compare/v1.1.1-beta.3...v1.1.1-beta.4) (2025-09-18)

### Bug Fixes

- Semantic release version bump ([e316168](https://github.com/ff6347/obsidian-canvas-context/commit/e31616800ca558212070229f610a128b0896a86c))

## [1.1.1-beta.3](https://github.com/ff6347/obsidian-canvas-context/compare/v1.1.1-beta.2...v1.1.1-beta.3) (2025-09-18)

### Bug Fixes

- Manifest version ([13cd304](https://github.com/ff6347/obsidian-canvas-context/commit/13cd30486a5404730ec953e23ebaecc882b06e1c))

## [1.1.1-beta.2](https://github.com/ff6347/obsidian-canvas-context/compare/v1.1.1-beta.1...v1.1.1-beta.2) (2025-09-18)

### Bug Fixes

- Use error at least for warnings ([30f34c1](https://github.com/ff6347/obsidian-canvas-context/commit/30f34c113ccbe4ef73944f24989d3da3989920eb))
- **view:** Inference can be run from view again ([007dbca](https://github.com/ff6347/obsidian-canvas-context/commit/007dbcad8f69213d7853ea41ce813dd0b2833a24))

# [1.0.0-beta.2](https://github.com/ff6347/obsidian-canvas-context/compare/v1.0.0-beta.1...v1.0.0-beta.2) (2025-09-07)

### Features

- Add base-ui ([5e842d2](https://github.com/ff6347/obsidian-canvas-context/commit/5e842d2426c52cad0c79e08dfb7efdc85b60bd08))

# 1.0.0-beta.1 (2025-09-07)

### Features

- Allow Cards as nodes ([117d4fe](https://github.com/ff6347/obsidian-canvas-context/commit/117d4feec0a3f70c9e468809e9850b394cbaca8c))
- Allow text nodes ([9b82063](https://github.com/ff6347/obsidian-canvas-context/commit/9b8206359096fc0eb4da18b195debf25c9758eb3))
- Call llm using llm studio ([d16a1b2](https://github.com/ff6347/obsidian-canvas-context/commit/d16a1b2bfc19433d9e2b48e9d8a6ef765da8f281))
- Include settings and ract view ([3be1305](https://github.com/ff6347/obsidian-canvas-context/commit/3be1305f2ff69ca27dd078884a8ad221df704f88))
- Loading ([babff9a](https://github.com/ff6347/obsidian-canvas-context/commit/babff9a679fd12fa09febb73c01cb556653dccf1))
- Ollama as provider ([80706a4](https://github.com/ff6347/obsidian-canvas-context/commit/80706a4b93b6590a56ab5677384939643dfad03e))
- React view scaffold ([229d44d](https://github.com/ff6347/obsidian-canvas-context/commit/229d44d4714fce4b48e85d8712b5306ada4119c2))
- Tree walker algo ([dce151a](https://github.com/ff6347/obsidian-canvas-context/commit/dce151a6dfba72c9ac1dd92f7d54619ea8c94d3c))
