#!/bin/zsh

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "${YELLOW}🔍 Checking and clearing ports...${NC}"

# Function to kill process on a specific port
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port)
    
    if [ ! -z "$pid" ]; then
        echo "${YELLOW}Found process $pid on port $port. Killing...${NC}"
        kill -9 $pid 2>/dev/null
        sleep 1
        echo "${GREEN}✓ Port $port cleared${NC}"
    else
        echo "${GREEN}✓ Port $port is already free${NC}"
    fi
}

# Clear backend port (3001)
kill_port 3001

# Clear frontend port (5173)
kill_port 5173

echo "\n${GREEN}🚀 Starting development servers...${NC}\n"

# Get the absolute path of the project root
PROJECT_ROOT=$(pwd)

# Start backend in new terminal
echo "${YELLOW}Starting backend on port 3001 in new terminal...${NC}"
osascript <<EOF
tell application "Terminal"
    do script "cd '$PROJECT_ROOT/backend' && npm run dev"
    activate
end tell
EOF

# Wait a moment before starting frontend
sleep 1

# Start frontend in new terminal
echo "${YELLOW}Starting frontend on port 5173 in new terminal...${NC}"
osascript <<EOF
tell application "Terminal"
    do script "cd '$PROJECT_ROOT/frontend' && npm run dev"
    activate
end tell
EOF

echo "\n${GREEN}✓ Both servers started in separate terminals!${NC}"
echo "${YELLOW}Close the terminal windows to stop the servers${NC}\n"
