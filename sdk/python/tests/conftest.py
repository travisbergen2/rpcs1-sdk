"""
pytest configuration for RPCS-1 Python SDK tests.

The package is installed via `pip install -e .` during development.
If running directly, add the src/ directory to the path.
"""
import sys
from pathlib import Path

# Ensure src/ is on the path when running tests without installing the package
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
