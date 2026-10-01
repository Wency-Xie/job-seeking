#!/usr/bin/env python3
"""Validate a Matcher analysis and print its deterministic score and advice."""

import argparse
import json
from pathlib import Path

from matcher_common import calculate_result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    args = parser.parse_args()
    bundle = json.loads(args.input.read_text(encoding="utf-8"))
    print(json.dumps(calculate_result(bundle), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

