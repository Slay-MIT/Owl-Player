# ===========================================
# Owl-Player Makefile
# Common commands for development and deployment
# ===========================================

.PHONY: help dev start stop clean build test lint docs

# Default target
help:
	@echo "🦉 Owl-Player - Available Commands:"
	@echo ""
	@echo "Development:"
	@echo "  make dev              - Start all services in development mode"
	@echo "  make api              - Start API server only"
	@echo "  make worker           - Start video processing worker only"
	@echo "  make frontend         - Start Next.js frontend only"
	@echo ""
	@echo "Docker:"
	@echo "  make start            - Start all services with Docker"
	@echo "  make stop             - Stop all Docker services"
	@echo "  make clean            - Stop and remove Docker containers/volumes"
	@echo "  make rebuild          - Rebuild all Docker images"
	@echo "  make logs             - View Docker logs"
	@echo "  make logs-api         - View API service logs"
	@echo "  make logs-frontend    - View frontend service logs"
	@echo ""
	@echo "Maintenance:"
	@echo "  migrate               - Run database migrations"
	@echo "  reset-db              - Reset database (WARNING: deletes all data)"
	@echo "  backup                - Create database backup"
	@echo ""
	@echo "Code Quality:"
	@echo "  lint                  - Run ESLint on frontend"
	@echo "  format                - Format code with Prettier"
	@echo ""
	@echo "Documentation:"
	@echo "  docs                  - Generate documentation"
	@echo ""

# Development mode (local)
dev:
	@echo "🚀 Starting Owl-Player in development mode..."
	@echo ""
	@echo "Terminal 1 - API Server:"
	@echo "cd api && npm run dev"
	@echo ""
	@echo "Terminal 2 - Worker:"
	@echo "cd api && npm run worker"
	@echo ""
	@echo "Terminal 3 - Frontend:"
	@echo "cd frontend && npm run dev"
	@echo ""
	@echo "📝 Open three terminals and run the commands above."
	@echo ""

# Start API server only
api:
	@echo "🚀 Starting API server..."
	@cd api && npm run dev

# Start worker only
worker:
	@echo "🚀 Starting video processing worker..."
	@cd api && npm run worker

# Start frontend only
frontend:
	@echo "🚀 Starting Next.js frontend..."
	@cd frontend && npm run dev

# Docker commands
start:
	@echo "🐳 Starting all Docker services..."
	docker-compose up -d
	@echo ""
	@echo "✅ Services started!"
	@echo ""
	@echo "📍 Access the applications:"
	@echo "   Frontend:     http://localhost:3000"
	@echo "   API:          http://localhost:3001"
	@echo "   MinIO Console: http://localhost:9001 (admin/minioadmin)"
	@echo "   RabbitMQ UI:  http://localhost:15672 (guest/guest)"
	@echo ""

stop:
	@echo "🛑 Stopping all Docker services..."
	docker-compose down
	@echo "✅ Services stopped!"

clean: stop
	@echo "🧹 Cleaning up Docker resources..."
	docker-compose down -v
	docker system prune -f
	@echo "✅ Cleanup complete!"

rebuild:
	@echo "🔨 Rebuilding Docker images..."
	docker-compose build --no-cache
	@echo "✅ Images rebuilt!"

logs:
	@docker-compose logs -f

logs-api:
	@docker-compose logs -f api

logs-frontend:
	@docker-compose logs -f frontend

logs-worker:
	@docker-compose logs -f worker

logs-minio:
	@docker-compose logs -f minio

logs-postgres:
	@docker-compose logs -f postgres

logs-rabbitmq:
	@docker-compose logs -f rabbitmq

# Database commands
migrate:
	@echo "📊 Running database migrations..."
	@docker-compose exec postgres psql -U dev -d videos -f schema.sql
	@echo "✅ Migrations complete!"

reset-db:
	@echo "⚠️  WARNING: This will delete all data in the database!"
	@read -p "Are you sure? (y/N): " confirm && \
	if [ "$$confirm" = "y" ]; then \
		docker-compose down -v; \
		docker-compose up -d; \
		echo "✅ Database reset and services restarted!"; \
	else \
		echo "❌ Aborted."; \
	fi

backup:
	@echo "💾 Creating database backup..."
	@mkdir -p backups
	@docker-compose exec postgres pg_dump -U dev videos > backups/$(date +%Y%m%d_%H%M%S).sql
	@echo "✅ Backup created in ./backups/"

# Code quality
lint:
	@echo "🔍 Running ESLint..."
	@cd frontend && npm run lint

format:
	@echo "✨ Formatting code..."
	@cd frontend && npx prettier --write .

docs:
	@echo "📚 Generating documentation..."
	@echo "Documentation is available in README.md and DEPLOYMENT.md"

# Health checks
health:
	@echo "🏥 Running health checks..."
	@curl -s http://localhost:3001/api/health && echo " - API: OK" || echo " - API: FAILED"
	@curl -s http://localhost:3000/api/health && echo " - Frontend: OK" || echo " - Frontend: FAILED"

# Quick start for first-time setup
setup:
	@echo "🔧 Setting up Owl-Player..."
	@cp .env.example .env
	@echo ""
	@echo "✅ Environment file created!"
	@echo ""
	@echo "📝 Please edit .env with your configuration:"
	@echo "   - Change JWT_SECRET to a secure random value"
	@echo "   - Update CORS_ORIGINS for production"
	@echo "   - Set strong passwords for database and MinIO"
	@echo ""
	@echo "🚀 Now start with: make start"
