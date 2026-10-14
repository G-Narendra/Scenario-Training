#!/usr/bin/env bash
set -e
echo "=== 3H Solutions Scenario Training Verification Harness ==="
python -m pytest backend/tests/ -v
echo "=== Harness Green ==="
