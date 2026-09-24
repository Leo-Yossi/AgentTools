"""Build source and portable skill archives without including presentation projects."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json

root = Path(__file__).resolve().parents[1]
skill = root / "skills" / "html-slides"
release = root / "releases"
release.mkdir(exist_ok=True)
if not (skill / "node_modules" / "katex" / "package.json").is_file():
    raise SystemExit("Install skill dependencies with npm ci before packaging.")

version = json.loads((skill / 'package.json').read_text(encoding='utf-8'))['version']
for variant in ("source", "portable"):
    output = release / f"html-slides-{variant}-{version}.zip"
    with ZipFile(output, "w", ZIP_DEFLATED) as archive:
        for file in sorted(skill.rglob("*")):
            if not file.is_file():
                continue
            relative = file.relative_to(skill)
            if variant == "source" and "node_modules" in relative.parts:
                continue
            if file.is_symlink():
                continue  # optional dependency command shims; main CLI uses Node directly
            archive.write(file, Path("html-slides") / relative)
    with ZipFile(output) as archive:
        assert archive.testzip() is None
        names = archive.namelist()
        assert "html-slides/SKILL.md" in names
        assert "html-slides/scripts/slides.mjs" in names
        assert not any(name.startswith("html-slides/projects/") for name in names)
    print(f"{output} ({output.stat().st_size:,} bytes)")
