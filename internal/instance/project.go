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
        with:
          fetch-depth: 0

      - name: Generate changelog
        run: |
          set -e

          TAG="${GITHUB_REF#refs/tags/}"
          PREV_TAG=$(git tag --sort=-creatordate | grep -v "^${TAG}$" | head -n 1 || true)

          if [ -z "$PREV_TAG" ] || ! git rev-parse "$PREV_TAG" >/dev/null 2>&1; then
            echo '{}' > changelog.json
            exit 0
          fi

          # Get instance.json from previous and current
          git show "${PREV_TAG}:instance.json" > /tmp/old_instance.json 2>/dev/null || echo '{}' > /tmp/old_instance.json
          cp instance.json /tmp/new_instance.json

          # Generate changelog via inline Python
          python3 - <<'PYEOF'
          import json, sys

          def load(path):
              try:
                  with open(path) as f:
                      return json.load(f)
              except:
                  return {}

          old = load("/tmp/old_instance.json")
          new = load("/tmp/new_instance.json")

          changelog = {"meta_changes": [], "containers": []}

          # Detect meta field changes
          meta_fields = [
              ("minecraft_version", "Версия Minecraft"),
              ("loader", "Загрузчик"),
              ("loader_version", "Версия загрузчика"),
              ("name", "Название"),
              ("description", "Описание"),
          ]
          for field, label in meta_fields:
              old_val = old.get(field, "")
              new_val = new.get(field, "")
              if old_val != new_val:
                  changelog["meta_changes"].append({
                      "field": field,
                      "label": label,
                      "old_value": str(old_val),
                      "new_value": str(new_val),
                  })

          # Detect container content changes
          def content_key(c):
              return c.get("mod_id") or c.get("url") or c.get("file") or c.get("name", "")

          old_containers = {c["content_type"]: c for c in old.get("containers", [])}
          new_containers = {c["content_type"]: c for c in new.get("containers", [])}

          all_types = set(list(old_containers.keys()) + list(new_containers.keys()))

          for ct in sorted(all_types):
              old_content = old_containers.get(ct, {}).get("content", [])
              new_content = new_containers.get(ct, {}).get("content", [])

              old_map = {}
              for item in old_content:
                  k = content_key(item)
                  if k:
                      old_map[k] = item

              new_map = {}
              for item in new_content:
                  k = content_key(item)
                  if k:
                      new_map[k] = item

              added = []
              removed = []
              updated = []

              for k, item in new_map.items():
                  if k not in old_map:
                      added.append({"name": item.get("name", k), "image_url": item.get("image_url", "")})
                  else:
                      old_item = old_map[k]
                      if old_item.get("file_id") != item.get("file_id") or old_item.get("file") != item.get("file"):
                          updated.append({"name": item.get("name", k), "image_url": item.get("image_url", "")})

              for k, item in old_map.items():
                  if k not in new_map:
                      removed.append({"name": item.get("name", k), "image_url": item.get("image_url", "")})

              if added or removed or updated:
                  changelog["containers"].append({
                      "content_type": ct,
                      "added": added,
                      "removed": removed,
                      "updated": updated,
                  })

          # Read release message if present
          try:
              with open("release_message.txt") as f:
                  msg = f.read().strip()
                  if msg:
                      changelog["message"] = msg
          except:
              pass

          with open("changelog.json", "w") as f:
              json.dump(changelog, f, ensure_ascii=False, indent=2)
          PYEOF

      - name: Process local files
        run: |
          python3 - <<'PYEOF'
          import json, os, glob

          with open("instance.json") as f:
              meta = json.load(f)

          repo = os.environ.get("GITHUB_REPOSITORY", "")
          tag = os.environ.get("GITHUB_REF_NAME", "")
          local_files = []

          for container in meta.get("containers", []):
              ct = container.get("content_type", "")
              for item in container.get("content", []):
                  if item.get("source") == "local" and item.get("file"):
                      file_path = os.path.join(ct, item["file"])
                      if os.path.exists(file_path):
                          item["url"] = f"https://github.com/{repo}/releases/download/{tag}/{item['file']}"
                          local_files.append(file_path)

          with open("instance.json", "w") as f:
              json.dump(meta, f, ensure_ascii=False, indent=2)

          with open("local_files.txt", "w") as f:
              for lf in local_files:
                  f.write(lf + "\n")
          PYEOF

      - name: Collect local file assets
        id: local_assets
        run: |
          EXTRA_FILES=""
          if [ -f local_files.txt ]; then
            while IFS= read -r line; do
              if [ -n "$line" ] && [ -f "$line" ]; then
                EXTRA_FILES="${EXTRA_FILES}${line}"$'\n'
              fi
            done < local_files.txt
          fi
          echo "files<<EOF" >> $GITHUB_OUTPUT
          echo "$EXTRA_FILES" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      - name: Create Release & Upload Assets
        uses: softprops/action-gh-release@v2
        with:
          files: |
            instance.json
            changelog.json
            ${{ steps.local_assets.outputs.files }}
          body_path: release_message.txt
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