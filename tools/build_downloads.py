#!/usr/bin/env python3
"""Build or verify the two stable browser-extension ZIP downloads."""

from __future__ import annotations

import argparse
from pathlib import Path
import zipfile


ROOT = Path(__file__).resolve().parents[1]
PACKAGES = (
    ("job-capture", "job-capture-extension-source.zip", "job-capture-extension-source"),
    ("application-sync", "application-sync-extension.zip", "application-sync-extension"),
)


def source_files(folder: Path) -> dict[str, bytes]:
    return {
        str(path.relative_to(folder)): path.read_bytes()
        for path in folder.rglob("*")
        if path.is_file()
    }


def packed_files(archive: Path, archive_root: str) -> dict[str, bytes]:
    with zipfile.ZipFile(archive) as bundle:
        return {
            name.removeprefix(archive_root + "/"): bundle.read(name)
            for name in bundle.namelist()
            if not name.endswith("/")
        }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="verify without writing")
    args = parser.parse_args()
    downloads = ROOT / "downloads"
    downloads.mkdir(exist_ok=True)

    for source_name, archive_name, archive_root in PACKAGES:
        source = source_files(ROOT / "extensions" / source_name)
        archive = downloads / archive_name
        if not args.check:
            with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as bundle:
                for relative, data in sorted(source.items()):
                    bundle.writestr(f"{archive_root}/{relative}", data)
        if not archive.exists() or packed_files(archive, archive_root) != source:
            raise SystemExit(f"{archive_name}: ZIP differs from extension source")
        print(f"{archive_name}: {len(source)} files verified")


if __name__ == "__main__":
    main()
