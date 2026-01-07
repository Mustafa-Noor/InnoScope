# 🚀 InnoScope

**InnoScope** is an intelligent project assessment platform that combines machine learning, semantic search, and advanced LLMs to help teams evaluate project feasibility, conduct comprehensive research, and generate actionable roadmaps.

> Turning innovation ideas into viable projects with AI-powered insights

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [How It Works](#how-it-works)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [API Endpoints](#api-endpoints)
- [Development Workflow](#development-workflow)
- [Project Architecture](#project-architecture)
- [Core Services](#core-services)
- [Contributing](#contributing)

---

## 📖 Overview

InnoScope is a comprehensive AI-powered platform designed for entrepreneurs, product managers, and innovation teams. It addresses the critical challenge of project evaluation by providing:

1. **Feasibility Assessment** - Using ML models trained on real project data to predict success likelihood
2. **Research Synthesis** - Automatically gathering and summarizing relevant research from academic and web sources
3. **Roadmap Generation** - Creating detailed, actionable project roadmaps with milestones and timelines
4. **Collaborative Analysis** - Interactive chat-based interface for team discussions and refinement

### Problem Statement
Evaluating project feasibility is complex and time-consuming. Teams struggle with:
- ❌ Lack of data-driven assessment methods
- ❌ Scattered research from multiple sources
- ❌ Undefined project timelines and phases
- ❌ No collaborative analysis framework

### Solution
InnoScope provides an integrated pipeline that:
- ✅ Analyzes 25+ project parameters using ML models
- ✅ Searches and synthesizes relevant academic papers
- ✅ Generates realistic, milestone-based roadmaps
- ✅ Enables real-time team collaboration through chat

---

## ✨ Features

- 🤖 **ML-Based Feasibility Prediction** - Trained model analyzes project viability with confidence scores
- 📚 **Semantic Research Search** - Integrates arXiv, Wikipedia, and web search for relevant papers
- 🎯 **Intelligent Summarization** - Extract key insights from research documents automatically
- 🗺️ **Structured Roadmap Generation** - 8-phase roadmap: Prototype → Testing → Funding → Implementation → Marketing → Launch → Maintenance → Scaling
- 💬 **Real-time Chat Interface** - Discuss findings and refine assessments with team members
- 📊 **Detailed Feasibility Reports** - Multi-dimensional analysis covering technical, market, and financial aspects
- 🔐 **Secure Authentication** - JWT-based user authentication with role-based access control
- 🚀 **Streaming Responses** - Real-time data streaming for long-running operations
- 💾 **Database Persistence** - Store assessments, roadmaps, and chat histories

---

## 🔄 How It Works

### Feasibility Assessment Pipeline

```
1. INPUT COLLECTION
   User provides project details (25+ structured fields)
        ↓
2. ML PREDICTION
   Loaded model generates preliminary feasibility score
        ↓
3. SEMANTIC RESEARCH
   - Searches arXiv for academic papers
   - Queries Wikipedia for domain knowledge
   - Web search for recent developments
        ↓
4. LLM SYNTHESIS
   Processes all data through LangGraph pipeline to:
   - Consolidate findings
   - Identify risks and opportunities
   - Generate comprehensive analysis
        ↓
5. REPORT GENERATION
   Creates detailed report with:
   - ML confidence score
   - Risk assessment matrix
   - Supporting research citations
   - Actionable recommendations
```

### Roadmap Generation Pipeline

```
1. RESEARCH ANALYSIS INPUT
   - Feasibility report
   - Project research summary
   - Domain insights
        ↓
2. CONTEXT SYNTHESIS
   LLM reviews all available information
        ↓
3. STRUCTURED GENERATION
   Generates 8-phase roadmap with:
   - Clear objectives per phase
   - 3-6 key actions per phase
   - Measurable success metrics
   - Risk identification & mitigation
        ↓
4. OUTPUT
   Comprehensive timeline for project execution
```

### Chat Service

- Users can ask questions about feasibility assessments
- System provides contextual answers from previous analyses
- Team members can collaborate and refine conclusions
- Chat history is persisted for future reference

---

## �️ Project Architecture

### Backend Architecture Layers

```
┌─────────────────────────────────────────────┐
│         FastAPI Application Layer            │
│  (/routes) - HTTP endpoints & validation    │
├─────────────────────────────────────────────┤
│         Service Layer (/services)            │
│  Business logic for core features            │
│  - FeasibilityPredictor                      │
│  - RoadmapGenerator                          │
│  - ChatService                               │
│  - SemanticSearch                            │
│  - SummarizeResearch                         │
├─────────────────────────────────────────────┤
│      Pipeline Layer (/pipelines)             │
│  LangGraph workflows for complex operations  │
│  - Feasibility Assessment Pipeline           │
│  - Roadmap Generation Pipeline               │
│  - Research Synthesis Pipeline               │
├─────────────────────────────────────────────┤
│         Data Layer                           │
│  - PostgreSQL (user data, assessments)       │
│  - Qdrant (vector embeddings, search)        │
│  - HuggingFace Hub (model storage)           │
└─────────────────────────────────────────────┘
```

### Data Flow

```
User Input
   ↓
Schema Validation (Pydantic)
   ↓
Service Layer Processing
   ↓
Pipeline Orchestration (LangGraph)
   ├→ ML Model Prediction
   ├→ Semantic Search (Qdrant)
   ├→ LLM Processing (OpenAI)
   └→ Result Synthesis
   ↓
Database Persistence
   ↓
Response Formatting
   ↓
Client (Streaming or JSON)
```

### Frontend Architecture

```
Next.js App Router
   ↓
React Components
   ├─ Pages (Assessment, Roadmap, Chat)
   ├─ Components (Form, Results, Chat)
   └─ Utilities (API calls, formatting)
   ↓
State Management (React Hooks)
   ↓
API Calls to Backend
   ↓
Display & Interaction
```

---

## 🎯 Core Services

### 1. **Feasibility Predictor** (`services/feasibility_predictor.py`)
- Loads trained ML model from HuggingFace Hub
- Takes structured project parameters (25+ fields)
- Outputs feasibility score with confidence interval
- Fields analyzed: team size, budget, timeline, technology stack, market size, etc.

### 2. **Roadmap Generator** (`services/roadmap_generator.py`)
- Creates 8-phase project roadmap:
  1. Prototype Development
  2. Testing & Validation
  3. Funding & Grants
  4. Manufacturing/Implementation
  5. Marketing & Promotion
  6. Launch/Deployment
  7. Maintenance & Iteration
  8. Scaling & Expansion
- Each phase includes objectives, key actions, metrics, and risk mitigation

### 3. **Semantic Search** (`services/semantic_search.py`)
- Searches across multiple sources:
  - arXiv (academic papers)
  - Wikipedia (reference knowledge)
  - Web (DuckDuckGo integration)
- Returns relevant documents ranked by relevance
- Stores embeddings in Qdrant for fast retrieval

### 4. **Chat Service** (`services/chat_service.py`)
- Manages conversational AI interactions
- Maintains chat history and context
- Provides contextual answers based on assessments
- Supports multi-turn conversations

### 5. **Summarize Research** (`services/summarize_research.py`)
- Processes long documents and extracts key insights
- Generates concise summaries for research papers
- Consolidates findings from multiple sources

### 6. **Research Checks** (`services/research_checks.py`)
- Validates research findings
- Cross-references information
- Identifies contradictions or gaps

---

## 📁 Detailed Project Structure

```
InnoScope/
│
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI app initialization
│   │   ├── config.py               # Configuration & settings
│   │   ├── database.py             # Database connection & session
│   │   │
│   │   ├── models/                 # SQLAlchemy ORM models
│   │   │   ├── user.py             # User model
│   │   │   └── chat.py             # Chat & assessment models
│   │   │
│   │   ├── routes/                 # API endpoint handlers
│   │   │   ├── auth.py             # Authentication endpoints
│   │   │   ├── feasibility.py      # Feasibility assessment endpoints
│   │   │   ├── roadmap.py          # Roadmap generation endpoints
│   │   │   ├── chat.py             # Chat endpoints
│   │   │   └── summarize.py        # Document summarization endpoints
│   │   │
│   │   ├── services/               # Business logic services
│   │   │   ├── feasibility_predictor.py    # ML model predictions
│   │   │   ├── roadmap_generator.py       # Roadmap creation logic
│   │   │   ├── chat_service.py            # Conversational logic
│   │   │   ├── semantic_search.py         # Document search
│   │   │   ├── summarize_research.py      # Research summarization
│   │   │   └── research_checks.py         # Validation logic
│   │   │
│   │   ├── pipelines/              # LangGraph workflows
│   │   │   ├── refined_summary.py  # Summary refinement pipeline
│   │   │   └── builds/             # Complex pipeline implementations
│   │   │       ├── feasibility_pipeline_new.py      # Main assessment
│   │   │       ├── feasibility_pipeline_streaming.py # Stream version
│   │   │       ├── roadmap_pipeline.py              # Roadmap generation
│   │   │       ├── roadmap_pipeline_streaming.py    # Stream roadmap
│   │   │       ├── chat_agent.py                    # Chat orchestration
│   │   │       ├── researcher.py                    # Research coordinator
│   │   │       ├── scoping.py                       # Project scoping
│   │   │       └── summarize_pipeline.py            # Summary creation
│   │   │
│   │   ├── schemas/                # Pydantic request/response models
│   │   │   ├── feasibility.py      # Feasibility schemas
│   │   │   ├── roadmap.py          # Roadmap schemas
│   │   │   ├── chat.py             # Chat schemas
│   │   │   ├── user.py             # User schemas
│   │   │   └── research_state.py   # Pipeline state definitions
│   │   │
│   │   ├── utils/                  # Utility functions
│   │   │   ├── llm.py              # LLM API calls
│   │   │   ├── semantic_search.py  # Search utilities
│   │   │   ├── feasibility_converter.py  # Schema conversion
│   │   │   ├── extract.py          # Data extraction
│   │   │   ├── sanitize.py         # Input sanitization
│   │   │   ├── streaming.py        # Streaming utilities
│   │   │   ├── ddg.py              # DuckDuckGo integration
│   │   │   └── wiki.py             # Wikipedia integration
│   │   │
│   │   ├── security/               # Auth & security
│   │   │   ├── jwt_token.py        # JWT token generation/validation
│   │   │   ├── hashing.py          # Password hashing
│   │   │   └── deps.py             # Dependency injection
│   │   │
│   │   └── scripts/                # Utility scripts
│   │       ├── init_all_tables.py  # Database initialization
│   │       ├── generate_embeddings.py   # Embedding generation
│   │       ├── train_model.py      # ML model training
│   │       ├── test_feasibility.py # Testing utilities
│   │       └── check_qdrant.py     # Vector DB validation
│   │
│   ├── Dockerfile                  # Container configuration
│   ├── requirements.txt            # Python dependencies
│   └── README.md                   # Backend documentation
│
└── frontend/
    └── innoapp/
        ├── src/
        │   ├── app/                # Next.js pages
        │   │   ├── page.tsx        # Home page
        │   │   ├── assessment/     # Assessment flow
        │   │   ├── roadmap/        # Roadmap display
        │   │   └── chat/           # Chat interface
        │   │
        │   ├── components/         # Reusable React components
        │   │   ├── forms/          # Input forms
        │   │   ├── results/        # Result displays
        │   │   └── ui/             # UI components
        │   │
        │   └── utils/              # Utilities
        │       ├── api.ts          # API client
        │       └── format.ts       # Data formatting
        │
        ├── public/                 # Static assets
        ├── package.json            # Node dependencies
        └── tsconfig.json           # TypeScript config
```

---

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI (Python) - High-performance async web framework
- **Database**: 
  - PostgreSQL - Primary relational database
  - Qdrant - Vector database for semantic search
- **Authentication**: JWT tokens with secure hashing
- **AI/ML Stack**:
  - LangChain - LLM orchestration framework
  - LangGraph - State management for complex pipelines
  - Scikit-learn - ML model training and prediction
  - HuggingFace Hub - Model storage and retrieval
- **External APIs**: 
  - OpenAI GPT models
  - arXiv API (research papers)
  - DuckDuckGo (web search)
  - Wikipedia API
- **Deployment**: Docker containerization

### Frontend
- **Framework**: Next.js 13+ with React - Server-side rendering
- **Language**: TypeScript - Type-safe development
- **Styling**: Tailwind CSS - Utility-first CSS
- **State Management**: React Hooks + Context API
- **UI Components**: Custom components for form handling and display

---

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- Node.js 16+
- PostgreSQL 12+
- Docker (optional but recommended)
- API Keys:
  - OpenAI API key
  - HuggingFace token (for model downloads)

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database URL and API keys

# Initialize database tables
python app/scripts/init_all_tables.py

# Load ML models
python app/scripts/generate_embeddings.py

# Run development server
python app/main.py
```

**API Documentation**: Visit `http://localhost:8000/docs` for interactive Swagger UI

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend/innoapp

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit with your backend URL

# Run development server
npm run dev
```

**Application**: Open `http://localhost:3000` in your browser

### Docker Setup (Recommended)

```bash
# Build and run backend with Docker
cd backend
docker build -t innoscope-backend .
docker run -p 8000:8000 --env-file .env innoscope-backend
```

---

## 📡 API Endpoints

### Authentication Routes (`/auth`)
- `POST /auth/register` - Create new user account
- `POST /auth/login` - User login and token generation
- `POST /auth/refresh` - Refresh JWT token

### Feasibility Routes (`/feasibility`)
- `POST /feasibility/assess` - Full feasibility assessment
- `POST /feasibility/assess-document` - Assess from document upload
- `GET /feasibility/{assessment_id}` - Retrieve past assessment

### Roadmap Routes (`/roadmap`)
- `POST /roadmap/generate` - Generate project roadmap
- `GET /roadmap/{roadmap_id}` - Retrieve roadmap details

### Chat Routes (`/chat`)
- `POST /chat/message` - Send message to AI assistant
- `GET /chat/history/{session_id}` - Get chat history
- `POST /chat/session` - Create new chat session

### Summarization Routes (`/summarize`)
- `POST /summarize/document` - Summarize uploaded document
- `POST /summarize/text` - Summarize provided text

### Streaming Endpoints
- `POST /feasibility/assess-stream` - Stream feasibility assessment in real-time
- `POST /roadmap/generate-stream` - Stream roadmap generation

---

## 📖 Development Workflow

### Git Workflow

#### Branch Strategy

- **main** - Stable, production-ready code only
- **feature/** - New features (e.g., `feature/chat-interface`)
- **bugfix/** - Bug fixes (e.g., `bugfix/auth-validation`)
- **refactor/** - Code improvements (e.g., `refactor/database-schema`)
- **docs/** - Documentation updates

#### Step-by-Step Development Process

1. **Sync with Main Branch**
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Development & Commits**
   ```bash
   git add .
   git commit -m "feat: add new feasibility metric"
   git push origin feature/your-feature-name
   ```

4. **Submit Pull Request**
   - Create PR with clear description
   - Reference related issues
   - Request code review

5. **Handle Merge Conflicts**
   ```bash
   git fetch origin
   git merge origin/main
   # Resolve conflicts, then commit
   ```

6. **Merge to Main**
   - Ensure tests pass
   - Get team approval
   - Merge and delete branch

#### Best Practices

✅ **Do**
- Always pull from main before starting
- Write descriptive commit messages
- Test thoroughly before PR
- Review others' code promptly
- Keep PRs focused and manageable

❌ **Don't**
- Commit directly to main
- Mix multiple features in one PR
- Commit untested code
- Use vague messages ("fix", "update")
- Merge without discussion

---

## 🏛️ Project Architecture

### Backend Architecture Layers

```
┌─────────────────────────────────────────────┐
│         FastAPI Application Layer            │
│  (/routes) - HTTP endpoints & validation    │
├─────────────────────────────────────────────┤
│         Service Layer (/services)            │
│  Business logic for core features            │
│  - FeasibilityPredictor                      │
│  - RoadmapGenerator                          │
│  - ChatService                               │
│  - SemanticSearch                            │
│  - SummarizeResearch                         │
├─────────────────────────────────────────────┤
│      Pipeline Layer (/pipelines)             │
│  LangGraph workflows for complex operations  │
│  - Feasibility Assessment Pipeline           │
│  - Roadmap Generation Pipeline               │
│  - Research Synthesis Pipeline               │
├─────────────────────────────────────────────┤
│         Data Layer                           │
│  - PostgreSQL (user data, assessments)       │
│  - Qdrant (vector embeddings, search)        │
│  - HuggingFace Hub (model storage)           │
└─────────────────────────────────────────────┘
```

### Data Flow

```
User Input
   ↓
Schema Validation (Pydantic)
   ↓
Service Layer Processing
   ↓
Pipeline Orchestration (LangGraph)
   ├→ ML Model Prediction
   ├→ Semantic Search (Qdrant)
   ├→ LLM Processing (OpenAI)
   └→ Result Synthesis
   ↓
Database Persistence
   ↓
Response Formatting
   ↓
Client (Streaming or JSON)
```

### Core Services

- **Feasibility Predictor** - ML model predictions on project viability
- **Roadmap Generator** - Creates 8-phase project roadmaps
- **Chat Service** - Conversational AI interactions
- **Semantic Search** - Document retrieval across multiple sources
- **Summarize Research** - Extracts key insights from documents
- **Research Checks** - Validates and cross-references findings

---

## 🌟 Key Technologies & Integrations

### Machine Learning & AI
- **Model Training**: Scikit-learn with XGBoost
- **LLM Orchestration**: LangChain + LangGraph
- **Embedding Generation**: OpenAI embeddings
- **Model Serving**: HuggingFace Hub

### Data Management
- **Relational DB**: PostgreSQL with SQLAlchemy ORM
- **Vector DB**: Qdrant for semantic search
- **Caching**: In-memory caching for performance

### External Integrations
- **OpenAI**: GPT-4 for advanced reasoning
- **arXiv**: Academic paper search
- **Wikipedia**: Background knowledge
- **DuckDuckGo**: Web search capabilities
- **HuggingFace**: Model distribution

---

## 🔒 Security Features

- **Authentication**: JWT tokens with configurable expiration
- **Password Security**: Bcrypt hashing with salt
- **Input Validation**: Pydantic schemas with type checking
- **CORS**: Configurable cross-origin resource sharing
- **Database**: SQL injection prevention via ORM
- **Environment Variables**: Sensitive data in `.env` files
- **Authorization**: Role-based access control (planned)

---

## 🧪 Testing & Validation

```bash
# Test feasibility pipeline
python app/scripts/test_feasibility.py

# Test structured feasibility
python app/scripts/test_structured_feasibility.py

# Check vector database
python app/scripts/check_qdrant.py

# Train ML model
python app/scripts/train_model.py
```

---

## 🤝 Contributing Guidelines

### Before Contributing
1. Understand the project architecture
2. Read existing code to follow conventions
3. Check open issues to avoid duplication

### Python Code Standards
- Follow PEP 8 style guide
- Use type hints for clarity
- Add docstrings to functions
- Keep functions under 50 lines

### TypeScript/React Standards
- Follow ESLint configuration
- Use functional components with hooks
- Add TypeScript interfaces for props
- Keep components under 200 lines

### Documentation
- Update README for new features
- Add docstrings and comments
- Update API documentation

---

## 🐛 Troubleshooting

**Database Connection Error**
```bash
# Check PostgreSQL is running and credentials correct
python app/scripts/check_database.py
```

**Vector DB Error**
```bash
# Verify Qdrant is running
python app/scripts/check_qdrant.py
```

**Model Loading Error**
```bash
# Check HuggingFace token and internet
python app/scripts/generate_embeddings.py
```

---

## 📚 Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [LangChain Documentation](https://python.langchain.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Qdrant Vector Database](https://qdrant.tech/documentation/)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)

---

## 🎯 Roadmap

### Version 1.0 (Current)
- ✅ Feasibility assessment
- ✅ Research synthesis
- ✅ Roadmap generation
- ✅ User authentication
- ✅ Chat interface

### Version 2.0 (Planned)
- 🔄 Advanced ML models
- 🔄 Team collaboration
- 🔄 PDF/PowerPoint export
- 🔄 Risk dashboard

### Version 3.0 (Future)
- 📅 Market analysis
- 📅 Financial modeling
- 📅 Competitive analysis
- 📅 Mobile support

---

**Last Updated**: December 2025 | **Project Lead**: Team InnoScope
