#!/bin/bash
# Integration Test Runner
# Spins up Docker containers, runs tests, then cleans up

set -e

echo "🚀 Starting integration test environment..."

# Use test-specific compose file
COMPOSE_FILE="docker-compose.test.yml"

# Clean up any existing containers
docker compose -f $COMPOSE_FILE down -v 2>/dev/null || true

# Build and start containers
echo "📦 Building and starting containers..."
docker compose -f $COMPOSE_FILE up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to be healthy..."
sleep 5

# Check if API is ready
MAX_ATTEMPTS=30
ATTEMPT=0
until curl -s http://localhost:3001/api/health > /dev/null 2>&1; do
  ATTEMPT=$((ATTEMPT + 1))
  if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
    echo "❌ API failed to start"
    docker compose -f $COMPOSE_FILE logs app
    docker compose -f $COMPOSE_FILE down -v
    exit 1
  fi
  echo "  Waiting for API... ($ATTEMPT/$MAX_ATTEMPTS)"
  sleep 2
done

echo "✅ API is ready!"

# Run integration tests
echo "🧪 Running integration tests..."
TEST_API_URL=http://localhost:3001 npm run test:integration:run

TEST_EXIT_CODE=$?

# Clean up
echo "🧹 Cleaning up..."
docker compose -f $COMPOSE_FILE down -v

if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo "✅ All integration tests passed!"
else
  echo "❌ Integration tests failed"
fi

exit $TEST_EXIT_CODE
