SHELL := /bin/bash

COMPOSE_PROD = docker-compose -f docker-compose.yml
COMPOSE_DEV = docker-compose -f docker-compose.dev.yml
FAUCET_SCRIPT = ./knox-devnet/faucet.sh

.DEFAULT_GOAL := help


.PHONY: up
up: ## ✨ Build and start the full stack (Frontend + Nockchain Node) in detached mode.
	@echo "--- Starting Knox Full Stack (Production Mode) ---"
	$(COMPOSE_PROD) up --build -d --force-recreate
	@echo ""
	@echo "✅ System is up. It may take a few minutes for the miner to become healthy."
	@echo "   - Knox App: http://localhost:3000"
	@echo "   - Check status with: make status"

.PHONY: down
down: ## 🔽 Stop and remove all containers for the full stack.
	@echo "--- Shutting down Knox Full Stack ---"
	$(COMPOSE_PROD) down

.PHONY: logs
logs: ## 📜 View the real-time logs for all running services.
	@echo "--- Tailing logs (Press Ctrl+C to exit) ---"
	$(COMPOSE_PROD) logs -f

.PHONY: status
status: ## 📊 Show the status of the running containers.
	$(COMPOSE_PROD) ps

.PHONY: rebuild
rebuild: ## 🚀 Force a clean, no-cache rebuild of all production images.
	@echo "--- Starting a clean rebuild of all images ---"
	$(COMPOSE_PROD) build --no-cache


.PHONY: dev
dev: ## 🎨 Start the frontend-only Vite dev server with hot-reloading.
	@echo "--- Starting Knox Frontend Development Server ---"
	@echo "   - Access at: http://localhost:5173"
	@echo "   - (Press Ctrl+C to stop)"
	$(COMPOSE_DEV) up --build

.PHONY: dev-down
dev-down: ## ⏹️ Stop the frontend dev server.
	@echo "--- Shutting down frontend dev server ---"
	$(COMPOSE_DEV) down


.PHONY: init
init: ## 🔧 One-time setup: makes the faucet script executable.
	@echo "--- Making faucet script executable ---"
	@chmod +x $(FAUCET_SCRIPT)
	@echo "✅ Done."

.PHONY: faucet
faucet: ## 💰 Fund a vault on the local fakenet. Usage: make faucet address=<your-vault-address>
	@echo "--- Running Local Faucet ---"
	@if [ -z "$(address)" ]; then \
		echo "🔴 Error: 'address' variable is missing."; \
		echo "   Usage: make faucet address=<your-vault-address>"; \
		exit 1; \
	fi
	@$(FAUCET_SCRIPT) $(address)

.PHONY: clean
clean: ## 🧹 Hard reset: Stops all containers AND deletes all blockchain data volumes.
	@echo "--- Performing a hard clean (stopping containers and removing data volumes) ---"
	$(COMPOSE_PROD) down -v
	$(COMPOSE_DEV) down -v
	@echo "✅ All containers and volumes removed."

.PHONY: help
help: ## 🙋 Show this help message.
	@echo "--- Knox Project Commands ---"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'