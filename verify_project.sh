#!/bin/bash

echo "🔍 Playwright Dashboard Project Verification"
echo "============================================"
echo ""

# Check if project directory exists
if [ ! -d "frontend" ] || [ ! -d "backend" ] || [ ! -d "public" ]; then
    echo "❌ Project directories not found!"
    echo "   Expected: frontend/, backend/, public/"
    exit 1
fi

echo "✅ Project structure verified"
echo ""

# Check for key files
echo "📄 Checking key files..."
for file in README.md package.json LICENSE docker-compose.yml .gitignore QUICK_START.md PROJECT_SETUP.md FAQ.md COMPARISON.md IMPLEMENTATION.md; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file - NOT FOUND"
    fi
done
echo ""

# Check frontend
echo "🖥️  Checking frontend..."
if [ -d "frontend" ]; then
    echo "  ✅ Frontend directory exists"
    if [ -f "frontend/package.json" ]; then
        echo "  ✅ frontend/package.json found"
    fi
    if [ -d "frontend/src" ]; then
        echo "  ✅ frontend/src found"
    fi
    if [ -f "frontend/public/landing.html" ]; then
        echo "  ✅ frontend/public/landing.html found"
    fi
else
    echo "  ❌ Frontend directory NOT FOUND"
fi
echo ""

# Check backend
echo "🔧 Checking backend..."
if [ -d "backend" ]; then
    echo "  ✅ Backend directory exists"
    if [ -f "backend/package.json" ]; then
        echo "  ✅ backend/package.json found"
    fi
    if [ -d "backend/src" ]; then
        echo "  ✅ backend/src found"
    fi
else
    echo "  ❌ Backend directory NOT FOUND"
fi
echo ""

# Check public
echo "🌐 Checking public directory..."
if [ -d "public" ]; then
    echo "  ✅ Public directory exists"
    if [ -f "public/landing.html" ]; then
        echo "  ✅ public/landing.html found"
    fi
else
    echo "  ❌ Public directory NOT FOUND"
fi
echo ""

# Check CI/CD
echo "🔄 Checking CI/CD configuration..."
if [ -f "docker-compose.yml" ]; then
    echo "  ✅ docker-compose.yml found"
fi
if [ -f ".gitlab-ci.yml" ]; then
    echo "  ✅ .gitlab-ci.yml found"
fi
if [ -f "Jenkinsfile" ]; then
    echo "  ✅ Jenkinsfile found"
fi
echo ""

# Check workspace scripts
echo "⚡ Checking package.json scripts..."
if [ -f "package.json" ]; then
    echo "  ✅ Root package.json found"
    if command -v node &> /dev/null; then
        echo "  ✅ Node.js detected: $(node -v)"
    fi
    if command -v npm &> /dev/null; then
        echo "  ✅ npm detected: $(npm -v)"
    fi
fi
echo ""

echo "📊 Project Summary"
echo "=================="
echo "Project Location: $(pwd)"
echo "Frontend Files: $(find frontend -type f | wc -l)"
echo "Backend Files: $(find backend -type f | wc -l)"
echo "Public Files: $(find public -type f | wc -l)"
echo "Documentation Files: $(find . -maxdepth 1 -name "*.md" | wc -l)"
echo ""

echo "✨ Extraction Complete!"
echo ""
echo "🚀 Next Steps:"
echo "  1. npm run install"
echo "  2. npm run docker:up"
echo "  3. Visit http://localhost:5173/landing.html"
echo ""
