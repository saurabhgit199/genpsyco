#!/bin/bash

echo "Setting up Mental Health Audio Therapy Application..."
echo ""

# Backend setup
echo "Setting up backend..."
cd backend

if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

echo "Activating virtual environment..."
source venv/bin/activate

echo "Installing Python dependencies..."
pip install -r requirements.txt

if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
    else
        # Create .env file with template
        cat > .env << EOF
# Database Configuration
DATABASE_URL=sqlite:///./therapy_app.db

# JWT Configuration
SECRET_KEY=your-secret-key-change-in-production-please-use-a-strong-random-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# OpenAI API Configuration
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4

# Eleven Labs API Configuration
ELEVENLABS_API_KEY=your-elevenlabs-api-key-here
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
EOF
    fi
    echo ""
    echo "⚠️  IMPORTANT: Please edit backend/.env and add your API keys:"
    echo "   - OPENAI_API_KEY (get from https://platform.openai.com/)"
    echo "   - ELEVENLABS_API_KEY (get from https://elevenlabs.io/)"
    echo ""
    echo "See SETUP_GUIDE.md for detailed instructions on getting API keys."
    echo ""
else
    echo ".env file already exists"
fi

cd ..

# Frontend setup
echo ""
echo "Setting up frontend..."
cd frontend

if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    npm install
else
    echo "Node modules already installed"
fi

cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo ""
echo "1. Start the backend (in one terminal):"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   uvicorn app.main:app --reload --port 8000"
echo ""
echo "2. Start the frontend (in another terminal):"
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "Don't forget to add your API keys to backend/.env!"

