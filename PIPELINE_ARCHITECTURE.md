# InnoScope Pipeline Architecture - In-Depth Analysis

## Table of Contents
1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Pipeline Detailed Breakdown](#pipeline-detailed-breakdown)
4. [State Management](#state-management)
5. [Node Architecture](#node-architecture)
6. [Data Flow Diagrams](#data-flow-diagrams)
7. [Integration Points](#integration-points)

---

## Overview

InnoScope uses **LangGraph** (state machine framework) to orchestrate multi-step AI pipelines. Each pipeline is a directed acyclic graph (DAG) of processing nodes that transform state objects.

### Technology Stack
- **Framework**: LangGraph (StateGraph)
- **State Management**: Pydantic models
- **LLM Integration**: Custom LLM wrapper (`app.utils.llm`)
- **Streaming**: Server-Sent Events (SSE)
- **File Processing**: PDF/DOCX extraction

---

## Core Concepts

### 1. State-Based Architecture
Every pipeline operates on a **state object** (Pydantic BaseModel) that:
- Holds input data, intermediate results, and final outputs
- Flows through nodes sequentially
- Gets modified by each node
- Can be serialized/deserialized (JSON-compatible)

### 2. LangGraph Nodes
**Node** = Python function that:
- Takes state as input
- Performs one specific operation
- Returns modified state
- Cannot fail silently (errors propagate)

### 3. Graph Compilation
```python
graph = StateGraph(StateModel)
graph.add_node("node_name", node_function)
graph.add_edge("node1", "node2")  # Sequential
graph.add_conditional_edges("node", router_func, {"route1": "target1"})
compiled = graph.compile()
```

---

## Pipeline Detailed Breakdown

## 1. 📋 SUMMARIZATION PIPELINE

### Purpose
Extract text from documents and generate concise summaries.

### Architecture
```
File → [Extract Text] → [Cleanup] → [Summarize] → Summary
```

### State: `IntermediateState`
```python
class IntermediateState(BaseModel):
    raw_text: Optional[str] = None
    file_path: Optional[str] = None
    summary: Optional[str] = None
    initial_summary: Optional[str] = None
```

### Implementation: `summarize_pipeline.py`

#### Node Flow:
1. **Text Extraction** (`extract_text`)
   - Reads PDF/DOCX using `app.utils.extract`
   - Populates `state.raw_text`
   - Character count validation

2. **Summarization** (`summarize_research`)
   - LLM call with raw text
   - Removes markdown artifacts
   - Sets `state.summary` and `state.initial_summary`

### Code Structure:
```python
def summarize_pipeline_from_file(file_path: str) -> str:
    # Step 1: Extract
    raw_text = extract_text(file_path)
    
    # Step 2: Create state
    state = IntermediateState(raw_text=raw_text)
    
    # Step 3: Summarize
    summary = summarize_research(state.raw_text)
    
    # Step 4: Clean
    summary = re.sub(r"^```(?:\w+)?\s*|\s*```$", "", summary.strip())
    return summary
```

### Endpoints:
- **POST** `/summarize/text` - Direct text input
- **POST** `/summarize/file` - File upload

---

## 2. 🗺️ ROADMAP PIPELINE

### Purpose
Generate 8-phase implementation roadmap from research papers/summaries.

### Architecture (Unified 3-Stage)
```
Document → [Scoping] → [Research] → [Roadmap Generation] → 8-Phase Plan
```

### State: `CombinedState`
```python
class CombinedState(IntermediateState):
    research: Optional[ResearchState] = None
    roadmap: Optional[str] = None
```

### Implementation: `roadmap_pipeline.py`

#### Stage 1: SCOPING (`_scoping_node`)
**Purpose**: Extract and structure document information

**Sub-Pipeline** (`scoping.py`):
```
File → [Extract Text] → [Summarize & Extract] → Structured Data
```

**Nodes**:
1. `extract_text_node`: File → raw text
2. `summarize_and_extract_node`: **Combined LLM call** extracts:
   - Summary
   - Problem statement
   - Domain
   - Goals (list)
   - Prerequisites (list)
   - Key topics (list)

**Output State**:
```python
{
    "raw_text": "full document text...",
    "summary": "concise overview...",
    "problem_statement": "core problem being solved",
    "domain": "Computer Vision, Healthcare",
    "goals": ["Improve accuracy", "Reduce latency"],
    "prerequisites": ["Python 3.8+", "TensorFlow"],
    "key_topics": ["CNN", "Transfer Learning"]
}
```

#### Stage 2: RESEARCH (`_research_node`)
**Purpose**: Enrich context with external sources

**Sub-Pipeline** (`researcher.py`):
```
Summary → [Route Decision] → [Wiki OR DDG] → Consolidated Research
```

**Routing Logic** (Heuristic-based, no LLM):
- **Wiki**: Academic/technical domains, focused goals (1-2)
- **DDG**: Business/market domains, multiple goals (3+)

**Enrichment Nodes**:
1. `wiki_node`: Wikipedia API search + summarization
2. `ddg_node`: DuckDuckGo search + snippet extraction

**ResearchState Schema**:
```python
class ResearchState(BaseModel):
    intermediate: IntermediateState  # From scoping
    wiki_summary: Optional[str] = None
    ddg_results: Optional[List[str]] = None
    llm_research_report: Optional[str] = None  # Synthesized insights
    consolidated_research: Optional[str] = None  # Raw + synthesized
```

**Token Optimization**:
- Uses raw enrichment data directly (no extra LLM synthesis)
- Heuristic routing saves LLM call for source selection

#### Stage 3: ROADMAP GENERATION (`_roadmap_node`)
**Purpose**: Generate structured 8-phase implementation plan

**Service**: `roadmap_generator.py`

**Input Priority**:
1. LLM research report (highest fidelity)
2. Consolidated research
3. Summary (fallback)

**LLM Prompt Structure**:
```
CONTEXT: [Research/Summary]

Generate roadmap with EXACT headings:
1. Prototype Development
2. Testing & Validation
3. Funding & Grants
4. Manufacturing / Implementation
5. Marketing & Promotion
6. Launch / Deployment
7. Maintenance & Iteration
8. Scaling & Expansion

Each phase MUST include:
- Objective: (1 sentence)
- Key Actions: (3-6 bullets)
- Metrics: (2-4 KPIs)
- Risks & Mitigations: (1-3 bullets)
```

### Streaming Version: `roadmap_pipeline_streaming.py`

**SSE Events**:
```python
# Progress updates
format_status("Analyzing document...", progress=15, stage="scoping")
format_status("Gathering research...", progress=55, stage="research")
format_status("Generating roadmap...", progress=90, stage="roadmap")

# Final result
format_complete({
    "status": "success",
    "roadmap": "...",
    "refined_summary": "...",
    "initial_summary": "..."
})
```

**Progress Milestones**:
- 0%: Pipeline start
- 15%: Scoping begins
- 35%: Scoping complete
- 55%: Research begins
- 75%: Research complete
- 90%: Roadmap generation begins
- 100%: Complete

### Graph Visualization:
```
┌─────────────┐
│   START     │
└──────┬──────┘
       │
       v
┌──────────────┐
│   Scoping    │ (Extract + Summarize + Fields)
└──────┬───────┘
       │
       v
┌──────────────┐
│   Research   │ (Wiki/DDG + Synthesis)
└──────┬───────┘
       │
       v
┌──────────────┐
│   Roadmap    │ (LLM Generation)
└──────┬───────┘
       │
       v
┌──────────────┐
│     END      │
└──────────────┘
```

### Endpoints:
- **POST** `/roadmap/generate` - Upload file → roadmap
- **POST** `/roadmap/generate-stream` - Streaming version (SSE)
- **POST** `/roadmap/generate-from-summary-stream` - From text summary
- **POST** `/roadmap/from-chat/{session_id}` - From chat session

---

## 3. 📊 FEASIBILITY ASSESSMENT PIPELINE

### Purpose
Multi-dimensional feasibility analysis across 5 dimensions.

### Architecture
```
Document → [Scoping] → [5 Dimension Assessments] → [Report] → Score + Report
```

### State: `FeasibilityAssessmentState`
```python
class FeasibilitySubScore(BaseModel):
    score: int  # 0-100
    explanation: str
    recommendation: Optional[str]

class FeasibilityAssessmentState(BaseModel):
    # Inputs
    refined_summary: Optional[str]
    problem_statement: Optional[str]
    domain: Optional[str]
    goals: Optional[List[str]]
    prerequisites: Optional[List[str]]
    key_topics: Optional[List[str]]
    
    # 5 Sub-assessments
    technical_feasibility: Optional[FeasibilitySubScore]
    resource_feasibility: Optional[FeasibilitySubScore]
    skills_feasibility: Optional[FeasibilitySubScore]
    scope_feasibility: Optional[FeasibilitySubScore]
    risk_feasibility: Optional[FeasibilitySubScore]
    
    # Final output
    final_score: Optional[int]  # 0-100 (average of 5)
    overall_explanation: Optional[str]
    final_report: Optional[str]
```

### Implementation: `feasibility_pipeline_from_document_streaming.py`

#### Stage 1: SCOPING (0-15%)
**Reuses roadmap scoping** to extract structured data.

#### Stage 2: DIMENSION ASSESSMENTS (15-90%)

Each dimension is a **separate LLM call** (parallel potential):

##### 1. Technical Feasibility (25-35%)
**Node**: `assess_technical_feasibility_node`

**LLM Prompt**:
```
Assess technical feasibility (0-100):
- Tech stack maturity
- Integration complexity
- Data requirements

Project: {summary[:300]}
Topics: {key_topics}

Return JSON:
{
  "score": 75,
  "explanation": "Mature tech stack but complex integrations",
  "recommendation": "Use microservices architecture"
}
```

##### 2. Resource Feasibility (40-50%)
**Node**: `assess_resource_feasibility_node`

**Evaluates**:
- Budget requirements
- Infrastructure needs
- Tool availability
- Licensing costs

##### 3. Skills Feasibility (55-65%)
**Node**: `assess_skills_feasibility_node`

**Evaluates**:
- Required expertise level
- Learning curve
- Team capability gaps
- Training needs

##### 4. Scope Feasibility (70-80%)
**Node**: `assess_scope_feasibility_node`

**Evaluates**:
- Timeline realism
- Feature complexity
- MVP feasibility
- Scope creep risks

##### 5. Risk Feasibility (85-90%)
**Node**: `assess_risk_feasibility_node`

**Evaluates**:
- Technical risks
- Market risks
- Regulatory compliance
- Security concerns

#### Stage 3: REPORT GENERATION (95-100%)
**Node**: `generate_feasibility_report_node`

**Combines**:
- Average of 5 dimension scores → `final_score`
- Concatenated explanations → `overall_explanation`
- Structured report with sections → `final_report`

### Final Output Structure:
```json
{
  "final_score": 73,
  "sub_scores": {
    "technical": 80,
    "resources": 65,
    "skills": 70,
    "scope": 75,
    "risk": 75
  },
  "explanation": "Project shows strong technical foundation...",
  "recommendations": [
    "Secure budget for cloud infrastructure",
    "Hire ML engineer with NLP experience",
    "Define MVP scope clearly"
  ],
  "detailed_report": "# Feasibility Analysis\n\n## Technical..."
}
```

### Streaming Event Flow:
```python
yield format_status("Extracting document...", progress=0, stage="scoping")
yield format_status("Document analysis complete", progress=15, stage="scoping_complete")
yield format_status("Assessing technical feasibility...", progress=25, stage="technical")
yield format_status("Technical: 80/100", progress=35, stage="technical_complete")
yield format_status("Assessing resource feasibility...", progress=40, stage="resource")
# ... continues for all 5 dimensions
yield format_status("Generating final report...", progress=95, stage="report")
yield format_complete(final_result)
```

### Endpoints:
- **POST** `/feasibility/from-chat/{session_id}/stream` - From chat session (streaming)

---

## 4. 💬 CHAT AGENT PIPELINE

### Purpose
Interactive conversational interface to gather project requirements through natural dialogue.

### Architecture
```
User Message → [Extract] → [Find Missing] → {Ask More | Generate Summary}
```

### State: `ChatState`
```python
class ChatState(IntermediateState):
    memory_text: Optional[str] = None  # Full conversation history
    reply_text: Optional[str] = None   # Bot's response
    missing_fields: Optional[List[str]] = None  # Incomplete fields
    completed: Optional[bool] = None   # Conversation complete?
    message_pairs: Optional[int] = 0   # Turn counter
    assume_ok: Optional[bool] = False  # Auto-complete flag
```

### Implementation: `chat_agent.py`

#### Node 1: EXTRACT (`chat_extract_fields_node`)
**Purpose**: Parse conversation for structured fields

**LLM Prompt**:
```
Extract project scoping fields from conversation.

Conversation:
{memory_text}

Return STRICT JSON:
{
  "problem_statement": "...",
  "domain": "...",
  "goals": ["goal1", "goal2"],
  "prerequisites": [],
  "key_topics": ["topic1"]
}
```

**Processing**:
- JSON extraction with regex fallback
- List normalization (string → array)
- Null handling

#### Node 2: FIND MISSING (`chat_find_missing_node`)
**Purpose**: Identify incomplete/unclear fields

**Logic**:
```python
def chat_find_missing_node(state):
    missing = []
    
    if not state.problem_statement or len(state.problem_statement) < 10:
        missing.append("problem_statement")
    
    if not state.domain:
        missing.append("domain")
    
    if not state.goals or len(state.goals) < 1:
        missing.append("goals")
    
    state.missing_fields = missing
    return state
```

#### Router: DECISION (`chat_route_decision`)
**Purpose**: Decide next action

**Logic**:
```python
def chat_route_decision(state) -> Literal["ask", "refine"]:
    # Force completion after 2 message pairs
    if state.message_pairs >= 2:
        return "refine"
    
    # If missing critical fields, ask more
    if state.missing_fields and len(state.missing_fields) > 0:
        return "ask"
    
    # Otherwise, generate summary
    return "refine"
```

**Routes**:
- `"ask"` → Generate clarifying question
- `"refine"` → Compose summary

#### Node 3a: GENERATE QUESTION (`chat_generate_question_node`)
**Purpose**: Ask for missing information

**LLM Prompt**:
```
You are a helpful assistant gathering project details.

Conversation so far:
{memory_text}

Missing: {missing_fields}

Generate ONE friendly question to gather this info.
Keep it conversational and concise.
```

**Sets**: `state.reply_text`
**Exits**: Graph ends (user responds, new turn starts)

#### Node 3b: COMPOSE BASELINE (`chat_compose_baseline_node`)
**Purpose**: Create initial structured summary

**LLM Prompt**:
```
Synthesize conversation into structured summary:

Conversation:
{memory_text}

Format:
## Problem Statement
{problem_statement}

## Domain
{domain}

## Goals
- {goal1}
- {goal2}

## Key Topics
- {topic1}
```

**Sets**: `state.initial_summary`

#### Node 4: REFINE SUMMARY (`chat_refine_research_style_node`)
**Purpose**: Polish summary for academic/professional tone

**LLM Prompt**:
```
Refine this project summary into research-style prose:

{initial_summary}

Requirements:
- Professional academic tone
- 3-4 paragraphs
- Clear problem, approach, goals
- No bullet points
```

**Sets**: `state.summary` (refined version)

#### Node 5: FINALIZE (`_finalize_node`)
**Purpose**: Mark completion and set final response

```python
def _finalize_node(state):
    if state.summary and not state.reply_text:
        state.reply_text = state.summary
    state.completed = True
    return state
```

### Graph Visualization:
```
┌─────────────┐
│   START     │
└──────┬──────┘
       │
       v
┌──────────────┐
│   Extract    │ (Parse conversation)
└──────┬───────┘
       │
       v
┌──────────────────┐
│  Find Missing    │
└──────┬───────────┘
       │
       v
    [Router]
      /   \
     /     \
    v       v
  Ask?    Refine?
    |       |
    v       v
┌───────┐ ┌─────────────┐
│Question│ │Compose Base │
└───┬───┘ └──────┬──────┘
    │            │
    v            v
  [END]    ┌──────────┐
           │  Refine  │
           └─────┬────┘
                 │
                 v
           ┌──────────┐
           │Finalize  │
           └─────┬────┘
                 │
                 v
               [END]
```

### Frontend Integration:
```javascript
// Chat message handler
const response = await callMcpTool("innoscope_send_chat_message", {
    token,
    message: userMessage,
    session_id: existingSessionId  // optional
});

if (response.is_complete) {
    // Show summary, enable roadmap/feasibility buttons
    setExtractedData({
        summary: response.summary,
        domain: response.domain,
        goals: response.goals,
        // ... other fields
    });
}
```

### Endpoints:
- **POST** `/chat/send-message` - Process user message
- **GET** `/chat/sessions` - List user's chat sessions
- **GET** `/chat/sessions/{session_id}/messages` - Get session history

---

## State Management

### State Inheritance Hierarchy
```
BaseModel (Pydantic)
    │
    ├── IntermediateState (base for all pipelines)
    │      ├── raw_text
    │      ├── file_path
    │      ├── problem_statement
    │      ├── domain
    │      ├── goals
    │      ├── prerequisites
    │      ├── key_topics
    │      └── summary
    │
    ├── CombinedState extends IntermediateState
    │      ├── research: ResearchState
    │      └── roadmap: str
    │
    ├── ChatState extends IntermediateState
    │      ├── memory_text
    │      ├── reply_text
    │      ├── missing_fields
    │      ├── completed
    │      └── message_pairs
    │
    └── FeasibilityAssessmentState
           ├── refined_summary
           ├── [IntermediateState fields]
           ├── technical_feasibility: FeasibilitySubScore
           ├── resource_feasibility: FeasibilitySubScore
           ├── skills_feasibility: FeasibilitySubScore
           ├── scope_feasibility: FeasibilitySubScore
           ├── risk_feasibility: FeasibilitySubScore
           ├── final_score: int
           ├── overall_explanation: str
           └── final_report: str
```

### State Persistence
- **Chat sessions**: Stored in PostgreSQL (`ChatSession`, `ChatMessage`, `ChatSessionState` tables)
- **Pipeline state**: Ephemeral (in-memory during execution)
- **Results**: Stored in session state after completion

---

## Node Architecture

### Node Types

#### 1. Extract Nodes
**Purpose**: Data extraction/parsing

**Examples**:
- `extract_text_node`: PDF/DOCX → text
- `chat_extract_fields_node`: Conversation → structured fields

#### 2. Transform Nodes
**Purpose**: Data transformation/processing

**Examples**:
- `summarize_and_extract_node`: Text → summary + fields
- `chat_compose_baseline_node`: Fields → structured summary

#### 3. Assessment Nodes
**Purpose**: Evaluation/scoring

**Examples**:
- `assess_technical_feasibility_node`: Project → technical score
- `assess_resource_feasibility_node`: Project → resource score

#### 4. Generation Nodes
**Purpose**: Content creation

**Examples**:
- `generate_roadmap`: Research → 8-phase plan
- `generate_feasibility_report_node`: Scores → detailed report

#### 5. Router Nodes
**Purpose**: Conditional routing

**Examples**:
- `chat_route_decision`: Decide ask vs. refine
- `research_llm_router_node`: Decide wiki vs. ddg

### Node Design Patterns

#### Pattern 1: LLM-Based Node
```python
def llm_node(state):
    prompt = f"Process this: {state.input}"
    response = call_llm(prompt)
    state.output = parse_response(response)
    return state
```

#### Pattern 2: Service-Based Node
```python
def service_node(state):
    result = external_service.process(state.data)
    state.result = result
    return state
```

#### Pattern 3: Validation Node
```python
def validation_node(state):
    if not state.required_field:
        state.errors.append("missing_field")
    return state
```

---

## Data Flow Diagrams

### Roadmap Pipeline - Complete Flow
```
┌─────────────┐
│  User       │
│  Upload     │
│  (PDF/DOCX) │
└──────┬──────┘
       │
       v
┌────────────────────────────────────────────────────┐
│  STAGE 1: SCOPING                                  │
│  ┌──────────┐    ┌─────────────────────────────┐  │
│  │ Extract  │───>│ Summarize & Extract Fields │  │
│  │  Text    │    │  - Summary                 │  │
│  └──────────┘    │  - Problem Statement       │  │
│                  │  - Domain                  │  │
│                  │  - Goals                   │  │
│                  │  - Prerequisites           │  │
│                  │  - Key Topics              │  │
│                  └─────────────┬───────────────┘  │
└────────────────────────────────┼───────────────────┘
                                 │
                                 v
┌────────────────────────────────────────────────────┐
│  STAGE 2: RESEARCH ENRICHMENT                      │
│  ┌───────────┐                                     │
│  │  Router   │  (Heuristic decision)               │
│  │  Decision │                                     │
│  └─────┬─────┘                                     │
│        │                                           │
│     ┌──┴───┐                                       │
│     v      v                                       │
│  ┌────┐  ┌────┐                                    │
│  │Wiki│  │DDG │                                    │
│  │API │  │API │                                    │
│  └─┬──┘  └─┬──┘                                    │
│    │      │                                        │
│    └───┬──┘                                        │
│        │                                           │
│        v                                           │
│  ┌──────────────┐                                  │
│  │Consolidated  │                                  │
│  │Research      │                                  │
│  └──────┬───────┘                                  │
└─────────┼──────────────────────────────────────────┘
          │
          v
┌────────────────────────────────────────────────────┐
│  STAGE 3: ROADMAP GENERATION                       │
│  ┌──────────────────────────────────────────────┐ │
│  │  LLM Prompt:                                 │ │
│  │  - Input: Research report / Summary          │ │
│  │  - Enforce: 8 canonical headings             │ │
│  │  - Structure: Objectives, Actions, Metrics   │ │
│  └──────────────────┬───────────────────────────┘ │
│                     │                              │
│                     v                              │
│  ┌──────────────────────────────────────────────┐ │
│  │  8-PHASE ROADMAP:                            │ │
│  │  1. Prototype Development                    │ │
│  │  2. Testing & Validation                     │ │
│  │  3. Funding & Grants                         │ │
│  │  4. Manufacturing / Implementation           │ │
│  │  5. Marketing & Promotion                    │ │
│  │  6. Launch / Deployment                      │ │
│  │  7. Maintenance & Iteration                  │ │
│  │  8. Scaling & Expansion                      │ │
│  └──────────────────┬───────────────────────────┘ │
└────────────────────┼────────────────────────────────┘
                     │
                     v
              ┌─────────────┐
              │   Output    │
              │   (JSON)    │
              └─────────────┘
```

### Feasibility Pipeline - Complete Flow
```
┌──────────────┐
│  Document/   │
│  Summary     │
└──────┬───────┘
       │
       v
┌─────────────────────────────────────────────┐
│  SCOPING (Reuse from Roadmap)               │
│  → Extract fields and summary               │
└──────────────────┬──────────────────────────┘
                   │
                   v
┌─────────────────────────────────────────────────────────┐
│  PARALLEL LLM ASSESSMENTS (5 dimensions)                │
│                                                          │
│  ┌────────────────┐  ┌────────────────┐                 │
│  │  Technical     │  │  Resource      │                 │
│  │  Feasibility   │  │  Feasibility   │                 │
│  │  ────────────  │  │  ────────────  │                 │
│  │  Score: 0-100  │  │  Score: 0-100  │                 │
│  │  Explanation   │  │  Explanation   │                 │
│  │  Recommend.    │  │  Recommend.    │                 │
│  └────────┬───────┘  └────────┬───────┘                 │
│           │                   │                          │
│  ┌────────v───────┐  ┌───────v────────┐                 │
│  │  Skills        │  │  Scope         │                 │
│  │  Feasibility   │  │  Feasibility   │                 │
│  │  ────────────  │  │  ────────────  │                 │
│  │  Score: 0-100  │  │  Score: 0-100  │                 │
│  │  Explanation   │  │  Explanation   │                 │
│  │  Recommend.    │  │  Recommend.    │                 │
│  └────────┬───────┘  └────────┬───────┘                 │
│           │                   │                          │
│           │      ┌────────────v──────────┐               │
│           │      │  Risk                 │               │
│           │      │  Feasibility          │               │
│           │      │  ──────────────        │               │
│           │      │  Score: 0-100         │               │
│           │      │  Explanation          │               │
│           │      │  Recommendation       │               │
│           │      └───────────┬───────────┘               │
│           └──────────────────┴───────────────────────────┤
└───────────────────────────────┬──────────────────────────┘
                                │
                                v
                 ┌──────────────────────────┐
                 │  REPORT GENERATION       │
                 │  ─────────────────────   │
                 │  - Calculate final score │
                 │    (average of 5)        │
                 │  - Consolidate text      │
                 │  - Format markdown       │
                 └──────────┬───────────────┘
                            │
                            v
                   ┌────────────────┐
                   │  Final Output  │
                   │  ────────────  │
                   │  final_score   │
                   │  sub_scores    │
                   │  explanation   │
                   │  recommend.    │
                   │  report        │
                   └────────────────┘
```

### Chat Agent - Conversation Flow
```
┌────────────────┐
│  User Message  │
└───────┬────────┘
        │
        v
┌────────────────────────────────────────┐
│  TURN N                                │
│  ┌──────────────────────────────────┐  │
│  │  Extract Fields from History     │  │
│  │  (LLM: parse conversation)       │  │
│  └──────────────┬───────────────────┘  │
│                 │                       │
│                 v                       │
│  ┌──────────────────────────────────┐  │
│  │  Check Missing Fields            │  │
│  │  - problem_statement?            │  │
│  │  - domain?                       │  │
│  │  - goals? (min 1)                │  │
│  └──────────────┬───────────────────┘  │
│                 │                       │
│                 v                       │
│           ┌─────────┐                   │
│           │ Router  │                   │
│           └────┬────┘                   │
│                │                       │
│      ┌─────────┴────────┐              │
│      v                  v              │
│  ┌───────┐         ┌────────┐          │
│  │Missing│         │Complete│          │
│  └───┬───┘         └───┬────┘          │
│      │                 │               │
│      v                 v               │
│  ┌────────────┐   ┌────────────┐      │
│  │ Generate   │   │ Compose    │      │
│  │ Question   │   │ Summary    │      │
│  └─────┬──────┘   └─────┬──────┘      │
│        │                │             │
│        v                v             │
│  ┌──────────┐    ┌────────────┐      │
│  │ Reply to │    │   Refine   │      │
│  │   User   │    │  Summary   │      │
│  └──────────┘    └─────┬──────┘      │
│                        │             │
│                        v             │
│                  ┌──────────┐        │
│                  │ Finalize │        │
│                  │ Complete │        │
│                  └─────┬────┘        │
└────────────────────────┼─────────────┘
                         │
                         v
                  ┌──────────────┐
                  │  is_complete │
                  │  = true      │
                  │              │
                  │  Show:       │
                  │  - Summary   │
                  │  - Domain    │
                  │  - Goals     │
                  │              │
                  │  Enable:     │
                  │  - Roadmap   │
                  │  - Feasibility│
                  └──────────────┘
```

---

## Integration Points

### Frontend → Backend Flow

#### 1. MCP Client Layer (`mcp-client.js`)
**Purpose**: Unified API wrapper for frontend

**Key Functions**:
```javascript
// Generic tool caller
callMcpTool(toolName, args)

// SSE streaming parser
callMcpToolAndParseSSE(toolName, args)
```

**Tool Mapping**:
```javascript
// Summarization
innoscope_summarize_text → /summarize/text
innoscope_summarize_file → /summarize/file

// Roadmap
innoscope_generate_roadmap_from_file_stream → /roadmap/generate-stream
generate_roadmap_from_summary → /roadmap/generate-from-summary-stream

// Feasibility
innoscope_assess_feasibility_from_file_stream → (custom streaming)
generate_feasibility_from_summary → /feasibility/from-chat/{id}/stream

// Chat
innoscope_send_chat_message → /chat/send-message
innoscope_get_chat_sessions → /chat/sessions
innoscope_get_session_messages → /chat/sessions/{id}/messages
```

#### 2. SSE Event Handling
**Format**:
```
event: status
data: {"stage": "scoping", "message": "Analyzing...", "progress": 15}

event: complete
data: {"status": "success", "roadmap": "...", "summary": "..."}

event: error
data: {"message": "Processing failed"}
```

**Frontend Processing**:
```javascript
const events = await callMcpToolAndParseSSE(toolName, args);
events.forEach(event => {
    if (event.type === "status") {
        setProgress(event.data.progress);
        setMessage(event.data.message);
    } else if (event.type === "complete") {
        setResult(event.data);
    }
});
```

#### 3. Database Integration
**Tables**:
- `chat_sessions`: Session metadata (user_id, created_at)
- `chat_messages`: Individual messages (session_id, sender, message)
- `chat_session_state`: Pipeline state (session_id, summary, domain, goals, etc.)

**Flow**:
```
User Message
    ↓
[POST /chat/send-message]
    ↓
[Chat Pipeline Execution]
    ↓
[Save to DB: message + updated state]
    ↓
[Return: reply + is_complete flag]
    ↓
[Frontend: Display + conditionally enable buttons]
```

---

## Performance Optimizations

### 1. Token Efficiency
- **Combined LLM calls**: `summarize_and_extract_node` does summary + field extraction in one call
- **Heuristic routing**: Research pipeline uses logic instead of LLM for source selection
- **Raw enrichment**: Skips synthesis step in research pipeline
- **Prompt optimization**: Concise, structured prompts with strict formatting

### 2. Streaming UX
- **Progressive disclosure**: SSE events keep user informed
- **Progress bars**: Clear milestones (0%, 15%, 35%, etc.)
- **Interruptible**: User can navigate away during processing

### 3. State Persistence
- **Session caching**: Chat state stored in DB for multi-turn conversations
- **Resume capability**: Can reconstruct pipeline state from DB

### 4. Parallel Processing (Future)
- Feasibility dimensions are independent → can run in parallel
- Multiple enrichment sources → concurrent API calls

---

## Error Handling

### Pipeline-Level
- LangGraph propagates exceptions through nodes
- Streaming pipelines yield error events: `format_error(message)`
- Frontend displays error messages and allows retry

### Node-Level
- LLM failures: Return state unchanged with error flag
- Validation failures: Append to `state.errors` list
- External API failures: Fallback to cached data or skip

### Frontend-Level
```javascript
try {
    const result = await callMcpTool(...);
    handleSuccess(result);
} catch (error) {
    console.error('Pipeline error:', error);
    alert('Processing failed: ' + error.message);
}
```

---

## Extensibility

### Adding a New Pipeline

1. **Define State Schema** (`app/schemas/`)
```python
class NewPipelineState(BaseModel):
    input_field: str
    output_field: Optional[str] = None
```

2. **Create Nodes** (`app/pipelines/nodes/`)
```python
def process_node(state: NewPipelineState):
    state.output_field = transform(state.input_field)
    return state
```

3. **Build Graph** (`app/pipelines/builds/`)
```python
def create_new_pipeline():
    graph = StateGraph(NewPipelineState)
    graph.add_node("process", process_node)
    graph.set_entry_point("process")
    graph.add_edge("process", END)
    return graph.compile()
```

4. **Create Endpoint** (`app/routes/`)
```python
@router.post("/new-pipeline")
async def run_new_pipeline(request: NewRequest):
    graph = create_new_pipeline()
    result = graph.invoke(NewPipelineState(input_field=request.data))
    return result
```

5. **Add Frontend Integration** (`frontend/src/utils/mcp-client.js`)
```javascript
// Tool mapping
const result = await callMcpTool('innoscope_new_pipeline', { data });
```

---

## Dependencies

### Core Libraries
- **langgraph**: State machine orchestration
- **pydantic**: Data validation and serialization
- **fastapi**: API framework
- **sqlalchemy**: Database ORM
- **openai/anthropic**: LLM providers

### Utility Modules
- `app.utils.extract`: PDF/DOCX text extraction
- `app.utils.llm`: LLM wrapper (supports multiple providers)
- `app.utils.streaming`: SSE formatting utilities
- `app.services.*`: Business logic services

---

## Conclusion

InnoScope's pipeline architecture demonstrates:
- **Modularity**: Reusable nodes and state objects
- **Composability**: Pipelines can be nested (scoping used in roadmap + feasibility)
- **Transparency**: Streaming provides real-time visibility
- **Extensibility**: Easy to add new pipelines following established patterns
- **Efficiency**: Token optimizations and smart routing reduce costs

The LangGraph framework provides robust state management and clear separation of concerns, making complex multi-step AI workflows maintainable and debuggable.

---

## Quick Reference

### Pipeline Summary Table

| Pipeline | Entry State | Exit State | Key Nodes | Endpoints |
|----------|------------|------------|-----------|-----------|
| **Summarization** | `file_path` | `summary` | extract_text, summarize | `/summarize/*` |
| **Roadmap** | `file_path` | `roadmap`, `summary` | scoping, research, roadmap | `/roadmap/*` |
| **Feasibility** | `file_path` or `summary` | `final_score`, `report` | scoping, 5 assessments, report | `/feasibility/*` |
| **Chat** | `memory_text` | `summary`, `reply_text` | extract, missing, question, compose, refine | `/chat/*` |

### Streaming Progress Ranges

| Pipeline | Stage | Progress % |
|----------|-------|------------|
| Roadmap | Scoping | 0-35% |
| Roadmap | Research | 35-75% |
| Roadmap | Generation | 75-100% |
| Feasibility | Scoping | 0-15% |
| Feasibility | Technical | 15-35% |
| Feasibility | Resource | 35-50% |
| Feasibility | Skills | 50-65% |
| Feasibility | Scope | 65-80% |
| Feasibility | Risk | 80-90% |
| Feasibility | Report | 90-100% |

---

**Document Version**: 1.0  
**Last Updated**: January 3, 2026  
**Maintained By**: InnoScope Engineering Team
