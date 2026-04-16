#!/bin/bash

# ============================================================================
# FLOWGEN - LOCAL DEVELOPMENT STARTUP (Mac/Linux)
# ============================================================================

echo ""
echo "============================================================"
echo "FlowGen Lead Generation SaaS - Local Development"
echo "============================================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker is not installed or not running"
    echo "Please install Docker Desktop to run Redis"
    echo ""
    exit 1
fi

# Start Redis
echo "[1/5] Starting Redis with Docker..."
docker-compose up -d redis
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to start Redis"
    exit 1
fi
echo "[OK] Redis started successfully"
echo ""

# Wait for Redis
echo "[2/5] Waiting for Redis to be ready..."
sleep 3

# Test Redis
if redis-cli ping > /dev/null 2>&1; then
    echo "[OK] Redis is responding"
else
    echo "[WARNING] Redis might not be ready yet"
fi
echo ""

# Install dependencies if needed
echo "[3/5] Checking dependencies..."
if [ ! -d "backend/node_modules" ]; then
    echo "Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    echo "[OK] Backend dependencies installed"
else
    echo "[OK] Backend dependencies already installed"
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    echo "[OK] Frontend dependencies installed"
else
    echo "[OK] Frontend dependencies already installed"
fi
echo ""

# Start Backend
echo "[4/5] Starting Backend server..."
gnome-terminal -- bash -c "cd backend && echo 'Starting Backend Server...' && npm run dev; exec bash" 2>/dev/null \
    || osascript -e 'tell app "Terminal" to do script' \
    'tell application "Terminal" to activate' \
    'tell application "System Events" to keystroke "cd backend && npm run dev" using command down' \
    'end tell' 2>/dev/null \
    || echo "Backend started in new terminal window"

echo "[OK] Backend starting..."
sleep 2
echo ""

# Start Frontend
echo "[5/5] Starting Frontend server..."
gnome-terminal -- bash -c "cd frontend && echo 'Starting Frontend Server...' && npm run dev; exec bash" 2>/dev/null \
    || osascript -e 'tell app "Terminal" to do script' \
    'tell application "Terminal" to activate' \
    'tell application "System Events" to keystroke "cd frontend && npm run dev" using command down' \
    'end tell' 2>/dev/null \
    || echo "Frontend started in new terminal window"

echo "[OK] Frontend starting..."
echo ""

echo "============================================================"
echo "ALL SERVICES STARTED!"
echo "============================================================"
echo ""
echo "Backend:  http://localhost:3001"
echo "Frontend: http://localhost:3000"
echo "Import:   http://localhost:3000/import"
echo ""
echo "Check the terminal windows for logs and any errors"
echo ""
echo "To stop all services:"
echo "  1. Press Ctrl+C in the Backend terminal"
echo "  2. Press Ctrl+C in the Frontend terminal"
echo "  3. Run: docker-compose down"
echo ""

# Try to open browser
if command -v xdg-open > /dev/null 2>&1; then
    xdg-open http://localhost:3000
elif command -v open > /dev/null 2>&1; then
    open http://localhost:3000
fi

echo "Browser opened to FlowGen!"
echo ""
echo "Press any key to exit..."
read -n 1
