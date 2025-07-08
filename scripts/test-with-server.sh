#!/bin/bash

echo "🚀 Starting OpenLearn Backend Server and Testing Rate Limiting"
echo "=============================================================="

# Change to project directory
cd /home/rishi/git/openlearn-backend

# Start the server in background
echo "📡 Starting server..."
node dist/server.js &
SERVER_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 5

# Check if server is running
if kill -0 $SERVER_PID 2>/dev/null; then
    echo "✅ Server started successfully (PID: $SERVER_PID)"
    
    # Run the rate limiting tests
    echo ""
    echo "🧪 Running Rate Limiting Tests..."
    echo "=================================="
    ./scripts/test-local-rate-limiting.sh
    
    # Cleanup
    echo ""
    echo "🛑 Stopping server..."
    kill $SERVER_PID
    wait $SERVER_PID 2>/dev/null
    echo "✅ Server stopped"
else
    echo "❌ Failed to start server"
    exit 1
fi
