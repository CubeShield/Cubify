package instance

const ReleaseWorkflow = `name: Release Modpack

on:
  push:
    tags:
      - "v*"

permissions:
  contents: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Create Release & Upload Assets
        uses: softprops/action-gh-release@v2
        with:
          files: |
            instance.json
          generate_release_notes: true
          draft: false
          prerelease: false
`

type ProjectSettings struct {
	Name             string
	Description      string
	MinecraftVersion string
	Loader           string
	LoaderVersion    string
	RepoLink         string
	LogoPath         string
}