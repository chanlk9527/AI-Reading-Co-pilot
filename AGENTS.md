# AGENTS.md - AI Agent Guidelines

This document provides guidance for AI agents working with the AI Reading Co-pilot project.

---

## 1. Project Overview

**AI Reading Co-pilot** is an immersive reading assistant that provides adaptive scaffolding for language learners. It supports two reading modes (Flow/Learn) with three scaffolding levels (1-3) to balance reading fluency and vocabulary acquisition.

### Tech Stack
| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React + Vite | SPA application |
| Backend | FastAPI (Python) | REST API |
| Database | SQLite | Lightweight local storage |
| NLP | spaCy | Sentence segmentation |
| AI | Aliyun Qwen / Google Gemini | Text analysis & chat |

### Project Structure
```
AI-Reading-Co-pilot/
├── src-react/          # React frontend (Vite)
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── context/    # React context providers
│   │   ├── pages/      # Page components
│   │   ├── services/   # API & AI services
│   │   └── styles/     # CSS files
│   └── package.json
├── backend/            # FastAPI backend
│   └── app/
│       ├── api/        # API route handlers
│       ├── models/     # SQLAlchemy models
│       └── services/   # Business logic
├── docs/               # Product & design documentation
└── *.bat/*.sh          # Startup scripts
```

---

## 1.1 Operational Constraints (High Priority)

> **CRITICAL**: Strict rules for managing running services.

1. **Do NOT Duplicate Services**: If a debug service (frontend or backend) is already running, **DO NOT** request to start another one.
2. **Restart Protocol**: If a restart is strictly necessary, you **MUST** stop the old instance first before starting a new one.
3. **Automated Checks**: Always use automated scripts or check process lists to confirm if an instance is running to avoid duplicates.

---

## 2. Build and Test Commands

### Frontend (src-react/)
```bash
# Install dependencies
npm install

# Development server (http://localhost:3000)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

### Backend (backend/)
```bash
# Install dependencies
pip install -r requirements.txt

# Start development server (http://localhost:8000)
uvicorn app.main:app --reload --port 8000

# Or use startup scripts from project root:
# Windows: restart_server.bat
# Linux/Mac: ./start_server.sh
```

### Full Stack Startup
```bash
# Windows
start_frontend.bat   # Start frontend
restart_server.bat   # Start backend

# Linux/Mac
./start_server.sh    # Start backend
cd src-react && npm run dev  # Start frontend
```

---

## 3. Code Style Guidelines

### JavaScript/React
- Use **functional components** with hooks
- Use **ES6+** syntax (arrow functions, destructuring, template literals)
- Component files use `.jsx` extension
- CSS uses vanilla CSS (no Tailwind), located in `src/styles/`
- State management via React Context (`AppContext`, `AuthContext`)

### Python/FastAPI
- Follow **PEP 8** style guide
- Use **type hints** for function parameters and return values
- SQLAlchemy for database models
- Pydantic schemas for request/response validation

### File Naming
- React components: `PascalCase.jsx` (e.g., `CopilotPanel.jsx`)
- Python modules: `snake_case.py` (e.g., `ai_service.py`)
- CSS files: `kebab-case.css` or `camelCase.css`

---

## 4. Testing Instructions

> ⚠️ **Note**: Automated tests are not yet implemented. Manual testing is required.

### Manual Testing Checklist
1. **Authentication Flow**: Login/Register at `/login`
2. **Reader Page**: Navigate to `/reader` or `/reader/:textId`
3. **Mode Switching**: Toggle between Flow (☕️) and Learn (🎓) modes
4. **Level Switching**: Test scaffolding levels 1-3
5. **Vocabulary Highlighting**: Verify words are highlighted based on vocab level
6. **Ask AI Feature**: Click ✨ to open AI chat bubble
7. **Reanalyze Button**: Test "重新分析" button in Learn mode

### Browser DevTools
- Check console for `[ReaderPage]` and `[Paragraph]` logs
- Monitor Network tab for API calls to `http://localhost:8000`

---

## 5. Security Considerations

### API Keys
- AI API keys are stored in `localStorage` (client-side)
- Default Aliyun key is hardcoded in `src/services/config.js` (development only)
- **Production**: Keys should be managed via environment variables on the backend

### Authentication
- JWT-based authentication
- Tokens stored in `localStorage`
- Backend validates tokens via `Authorization: Bearer <token>` header

### Database
- SQLite databases (`.db` files) contain user data
- `.db-shm` and `.db-wal` files are SQLite journaling files (can be deleted)
- **Do not commit** production database files

---

## 6. Commit Message Guidelines

Use conventional commit format:

```
<type>: <short description>

<optional body>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `chore`: Build/tooling changes

### Examples
```
feat: add vocabulary proficiency level selector
fix: reanalyze button activeId type mismatch
docs: update AGENTS.md with build commands
refactor: extract buildReplacement helper function
```

---

## 7. Development Tips

### Common Issues
1. **Words not highlighting**: Check regex in `Paragraph.jsx` `getTextHtml()`
2. **Reanalyze not working**: Verify `activeId` type consistency (string vs number)
3. **AI requests failing**: Check backend logs and API key configuration
4. **CORS errors**: Ensure backend is running on port 8000

### Key Files to Know
| File | Purpose |
|------|---------|
| `ReaderPage.jsx` | Main reader page, manages paragraph data |
| `Paragraph.jsx` | Individual paragraph rendering, word highlighting |
| `CopilotPanel.jsx` | Right sidebar with vocabulary cards |
| `AppContext.jsx` | Global state (mode, level, activeId, bookData) |
| `aiService.js` | AI API calls (streaming & non-streaming) |
| `prompts.js` | AI prompt templates |

### Documentation
- `docs/00_Master_PRD.md` - Product requirements document
- `docs/02_Mode_Flow.md` - Flow mode specifications
- `docs/03_Mode_Learn.md` - Learn mode specifications
- `docs/TECH_STACK.md` - Technology stack details
- `docs/LOCAL_STARTUP.md` - Local development setup

---

## 8. Deployment

### Frontend
- Build: `npm run build` (outputs to `src-react/dist/`)
- Host on any static file server (Vercel, Netlify, etc.)

### Backend
- Run with production server: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
- Configure environment variables for API keys
- Use persistent storage for SQLite database

---

*Last updated: 2026-02-04*
