"""Download rcratos/ayurveda-texts-english from Kaggle via kagglehub."""

import argparse
import logging
import os
import shutil
import sys
import zipfile
from pathlib import Path

import kagglehub
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

DATASET_SLUG = "rcratos/ayurveda-texts-english"


def _win_long_path(path: str) -> str:
    """Prefix absolute Windows paths so Win32 MAX_PATH (~260) does not apply."""
    abs_path = os.path.abspath(path)
    if sys.platform != "win32":
        return abs_path
    if abs_path.startswith("\\\\?\\"):
        return abs_path
    if abs_path.startswith("\\\\"):
        return "\\\\?\\UNC\\" + abs_path[2:]
    return "\\\\?\\" + abs_path


def _extract_zip_windows_long_paths(zip_path: str, out_dir: str) -> None:
    """Extract a zip using long paths (avoids FileNotFoundError on deep / long names)."""
    out_abs = Path(out_dir).resolve()
    out_root = _win_long_path(str(out_abs))
    os.makedirs(out_root, exist_ok=True)
    logger.info("Extracting with Windows long-path support (%s)...", out_dir)
    with zipfile.ZipFile(zip_path, "r") as zf:
        for info in zf.infolist():
            if info.filename.startswith("/") or ".." in Path(info.filename).parts:
                continue
            try:
                dest_path = (out_abs / Path(info.filename)).resolve()
            except (OSError, ValueError):
                continue
            if dest_path != out_abs and out_abs not in dest_path.parents:
                continue
            dest_long = _win_long_path(str(dest_path))
            if info.is_dir() or info.filename.endswith("/"):
                os.makedirs(dest_long, exist_ok=True)
                continue
            parent = os.path.dirname(dest_long)
            os.makedirs(parent, exist_ok=True)
            with zf.open(info, "r") as src, open(dest_long, "wb") as dst:
                shutil.copyfileobj(src, dst)


def _find_bundle_archive(output_dir: str) -> str | None:
    """Return path to kagglehub bundle archive in output_dir, if present."""
    root = Path(output_dir)
    for name in ("1.archive",):
        p = root / name
        if p.is_file():
            return str(p)
    archives = sorted(root.glob("*.archive"))
    return str(archives[-1]) if archives else None


def _output_dir_from_env() -> str | None:
    """Return output directory from env if set (KAGGLEHUB_OUTPUT_DIR or AYUR_KAGGLE_OUTPUT)."""
    for key in ("KAGGLEHUB_OUTPUT_DIR", "AYUR_KAGGLE_OUTPUT"):
        raw = os.getenv(key)
        if raw:
            return str(Path(raw).expanduser().resolve())
    return None


def _short_windows_output_dir() -> str:
    """Use a minimal path on the same drive as this script (single-letter folder at drive root)."""
    anchor = Path(__file__).resolve().anchor
    root = Path(anchor)
    if anchor and root != Path("."):
        return str((root / "k").resolve())
    return str(Path(r"C:\k").resolve())


def resolve_output_dir(cli_output_dir: str | None) -> str | None:
    """Pick extraction directory: CLI > env > (Windows: short drive path) > default kagglehub cache."""
    if cli_output_dir:
        return str(Path(cli_output_dir).expanduser().resolve())
    env_dir = _output_dir_from_env()
    if env_dir:
        return env_dir
    if sys.platform == "win32":
        short = _short_windows_output_dir()
        logger.info(
            "Windows: extracting to %s (minimal path; set KAGGLEHUB_OUTPUT_DIR or --output-dir to override).",
            short,
        )
        return short
    return None


def download_dataset(
    output_dir: str | None = None,
    *,
    force_download: bool = False,
) -> str:
    """Download the latest dataset revision and return the local directory path."""
    kwargs: dict = {}
    if output_dir is not None:
        kwargs["output_dir"] = output_dir
    if force_download:
        kwargs["force_download"] = True
    try:
        return kagglehub.dataset_download(DATASET_SLUG, **kwargs)
    except OSError as e:
        if sys.platform == "win32" and output_dir and isinstance(e, FileNotFoundError):
            archive = _find_bundle_archive(output_dir)
            if archive and zipfile.is_zipfile(archive):
                logger.warning(
                    "kagglehub hit Windows path limits during unzip; finishing extract with long paths."
                )
                _extract_zip_windows_long_paths(archive, output_dir)
                try:
                    os.remove(archive)
                except OSError as rm_err:
                    logger.warning("Could not remove archive %s: %s", archive, rm_err)
                return output_dir
        logger.exception("kagglehub dataset download failed: %s", e)
        raise
    except Exception as e:
        logger.exception("kagglehub dataset download failed: %s", e)
        raise


def main() -> None:
    """CLI entrypoint: download dataset and print its path."""
    parser = argparse.ArgumentParser(
        description="Download rcratos/ayurveda-texts-english (uses a short path on Windows by default).",
    )
    parser.add_argument(
        "--output-dir",
        default=None,
        help="Extract here (use the shortest path you can, e.g. D:\\k, on Windows).",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-download even if the target folder is already populated.",
    )
    args = parser.parse_args()

    out_dir = resolve_output_dir(args.output_dir)
    try:
        path = download_dataset(out_dir, force_download=args.force)
    except Exception:
        sys.exit(1)
    print("Path to dataset files:", path)


if __name__ == "__main__":
    main()
