.PHONY: setup dev test lint clean

setup:
	@bash scripts/setup.sh 2>/dev/null || powershell -ExecutionPolicy Bypass -File scripts/setup.ps1

dev:
	@bash scripts/run_dev.sh 2>/dev/null || powershell -ExecutionPolicy Bypass -File scripts/run_dev.ps1

test:
	@bash scripts/run_tests.sh 2>/dev/null || powershell -ExecutionPolicy Bypass -File scripts/run_tests.ps1

lint:
	@ruff check backend/
	@mypy --explicit-package-bases backend/app
	@cd frontend && npm run lint

clean:
	@rm -rf .pytest_cache .mypy_cache .ruff_cache htmlcov .coverage frontend/dist
