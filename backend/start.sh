#!/bin/bash

# F1 StratHub Backend Startup Script

echo "🚀 Starting F1 StratHub Backend..."
echo "📍 Server will run on http://localhost:8000"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 is not installed. Please install Python3 first."
    exit 1
fi

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Please install pip3 first."
    exit 1
fi

# Install dependencies if requirements.txt exists
if [ -f "requirements.txt" ]; then
    echo "📦 Installing dependencies..."
    pip3 install -r requirements.txt
fi

# Start the server
echo "⚡ Starting FastAPI server..."
echo "💡 Press Ctrl+C to stop the server"
echo ""

uvicorn app.main:app --reload --port 8000