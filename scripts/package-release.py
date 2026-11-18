"""Create reproducible import archives from the same source tree."""
import json
import sys
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

root = Path(__file__).resolve().parents[1]
dist = root / "dist"
version = json.loads((root / "manifest.json").read_text())["version"]


def package(name, files):
    if sys.argv[1:] == ["--check"]:
        with ZipFile(dist / name) as archive:
            if sorted(archive.namelist()) != sorted(member for member, _ in files):
                raise ValueError(f"{name}: unexpected archive contents")
            for member, source in files:
                if archive.read(member) != source.read_bytes():
                    raise ValueError(f"{name}: stale {member}")
        return
    with ZipFile(dist / name, "w") as archive:
        for member, source in sorted(files):
            info = ZipInfo(member)
            info.create_system = 3
            info.external_attr = (0o100755 if source.suffix == ".command" else 0o100644) << 16
            archive.writestr(info, source.read_bytes(), compress_type=ZIP_DEFLATED)


marinara = dist / "marinara"
package("handy-adaptive-marinara.zip", [(p.relative_to(marinara).as_posix(), p)
                                        for p in marinara.rglob("*") if p.is_file()])
paths = ["index.js", "synth.js", "charstyle.js", "style.css", "manifest.json", "README.md",
         "TRAINING.md", "Train.bat", "train.command", "trainer/trainer.py", "trainer/review.html",
         "docs/USER_GUIDE.md", "docs/MARINARA.md"]
package(f"handy-adaptive-v{version}.zip", [("handy-adaptive/" + p, root / p) for p in paths])
