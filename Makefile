.PHONY: default help

default: help

help:
	@echo "RabbitTrail browser extension now uses pnpm-based scripts."
	@echo "Common commands:"
	@echo "  pnpm build    # Build the extension"
	@echo "  pnpm dev      # Watch and rebuild on changes"
	@echo "  pnpm lint     # Run ESLint"
	@echo "  pnpm test     # Execute tests"
	@echo "  pnpm typecheck # Run TypeScript project references"
	@echo "  pnpm clean    # Remove build artifacts"
