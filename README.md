# 🚀 System2ML: AI-Driven ML Pipeline Design & Governance

> **Constraint-Aware Machine Learning Orchestration**
> Built for Hacksagon 2026 by **Dhairy Chauhan**

---

## 🎯 The Problem
Most ML pipelines are built in isolation from real-world constraints. Data scientists often design models that are too expensive, too slow, or ethically non-compliant (PII leaks) only to realize it after hours of training.

## 💡 The Solution: System2ML
**System2ML** is a production-ready platform that treats **constraints as first-class citizens**. It uses a "System 2" (analytical) approach to validate every pipeline against cost, carbon footprint, and latency limits before a single GPU cycle is spent.

### Key Innovations:
* 🧠 **AI Architect:** Powered by Llama-3.3 to synthesize optimal pipeline DAGs.
* 🛡️ **Governance Gate:** Automatic PII detection and constraint validation (Cost/Carbon).
* 🔄 **Hybrid Training:** Seamless transition from local prototyping to auto-generated Google Colab cloud training.
* 📉 **Real-Time Monitoring:** Live drift detection and automated "Kill-Switch" for failing constraints.

---

## 🛠 Tech Stack
| Layer | Technology |
| :--- | :--- |
| **Frontend** | Next.js 15 (App Router), TypeScript, Tailwind CSS, Shadcn UI |
| **Backend** | FastAPI (Python 3.11), Pydantic v2 |
| **Intelligence** | Groq (Llama-3.3-70B), LangChain |
| **Database** | SQLite with SQLAlchemy |
| **Infrastructure** | Vercel, Render, Docker |

---

## 🏗 System Architecture



[Image of microservices architecture diagram]


```mermaid
graph TD
    A[Dataset Upload] --> B{AI Architect}
    B --> C[Constraint Validator]
    C -->|Pass| D[Pipeline Execution]
    C -->|Fail| E[Optimization Loop]
    D --> F[Local Training]
    D --> G[Colab Generation]
    F & G --> H[Governance & Audit]