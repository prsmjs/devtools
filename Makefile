dev-server: ## Start the dev Express server with mock instances
	node dev/server.js

dev-client: ## Start the Vue dev server
	cd client && npm run dev

install: ## Install all dependencies
	npm install
	cd client && npm install

build: ## Build the client for distribution
	cd client && npm run build

up: ## Start Redis via docker compose
	docker compose up -d

down: ## Stop Redis
	docker compose down

.PHONY: dev-server dev-client install build up down help
help: ## Show help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(firstword $(MAKEFILE_LIST)) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[32m%-20s\033[0m %s\n", $$1, $$2}'
