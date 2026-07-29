// Canonical public profile data.
//
// Keep personal facts in this file only. The terminal commands, offline FAQ,
// and every LLM backend consume this same object so they cannot drift apart.

export interface ContactItem {
  label: string;
  value: string;
  href?: string;
}

export interface SkillGroup {
  label: string;
  items: string[];
}

export type ProjectStatus =
  | "featured"
  | "open-source"
  | "in-progress"
  | "additional";

export interface ProjectLink {
  label: string;
  url: string;
}

export interface Project {
  name: string;
  repo: string;
  status: ProjectStatus;
  role?: string;
  links?: ProjectLink[];
  technologies: string[];
  description: string;
  highlights: string[];
}

export interface Role {
  company: string;
  title: string;
  dates: string;
  location: string;
  achievements: string[];
}

export interface Education {
  degree: string;
  institution: string;
  graduation: string;
}

export interface Profile {
  updatedAt: string;
  fullName: string;
  preferredName: string;
  headline: string;
  location: string;
  summary: string;
  workAuthorization: string;
  targetRoles: string[];
  contacts: ContactItem[];
  skills: SkillGroup[];
  projects: Project[];
  experience: Role[];
  education: Education[];
}

export const PROFILE: Profile = {
  updatedAt: "2026-07-29",
  fullName: "Sanjay Dari Veerabasappa",
  preferredName: "Sanjay",
  headline: "Backend + AI engineer",
  location: "Chicago, IL",
  summary:
    "Backend and AI engineer currently building secure multi-agent financial-intelligence " +
    "systems at Virtual Gold. Experienced in production RAG, LLM evaluation, document " +
    "intelligence, event-driven services, and data-intensive APIs across AWS, Azure, and " +
    "hybrid on-premises/cloud environments.",
  workAuthorization: "US work authorization through OPT",
  targetRoles: ["Backend Engineer", "AI Engineer"],
  contacts: [
    {
      label: "email",
      value: "sanjaydv@umd.edu",
      href: "mailto:sanjaydv@umd.edu",
    },
    {
      label: "email (alt)",
      value: "reach.sdv1708@gmail.com",
      href: "mailto:reach.sdv1708@gmail.com",
    },
    {
      label: "linkedin",
      value: "linkedin.com/in/sanjay-dv/",
      href: "https://linkedin.com/in/sanjay-dv/",
    },
    {
      label: "github",
      value: "github.com/sdv1708",
      href: "https://github.com/sdv1708",
    },
    { label: "location", value: "Chicago, IL" },
  ],
  skills: [
    {
      label: "languages & databases",
      items: [
        "Python",
        "Java",
        "SQL",
        "PostgreSQL",
        "MySQL",
        "Redis",
        "Elasticsearch",
        "Pinecone",
      ],
    },
    {
      label: "backend",
      items: [
        "FastAPI",
        "Flask",
        "SQLAlchemy",
        "Microservices",
        "Kafka",
        "Airflow",
      ],
    },
    {
      label: "ml / ai",
      items: [
        "LLMs",
        "RAG",
        "LangChain",
        "LangGraph",
        "PyTorch",
        "Scikit-learn",
        "Hugging Face",
        "DeepEval",
        "AWS Bedrock",
        "MCP",
        "Ollama",
        "vLLM",
        "NetworkX",
      ],
    },
    {
      label: "cloud & tools",
      items: [
        "AWS",
        "AWS ECS",
        "Azure",
        "Azure Functions",
        "Azure Service Bus",
        "Azure Blob Storage",
        "Docker",
        "Kubernetes",
        "CI/CD",
        "Linux",
        "Prompt Engineering",
        "Claude Code",
        "Cursor",
      ],
    },
  ],
  projects: [
    {
      name: "PostMortem AI",
      repo: "github.com/sdv1708/postmortem",
      status: "featured",
      role: "Creator",
      technologies: [
        "FastAPI",
        "Next.js",
        "TypeScript",
        "SQLAlchemy",
        "PostgreSQL",
        "Playwright",
      ],
      description:
        "An evidence-review system that turns logs, traces, and deployment notes into " +
        "reviewed incident postmortems without allowing fluent but unsupported claims to " +
        "pass as facts.",
      highlights: [
        "Runs a visible six-stage analysis pipeline covering evidence normalization, fact " +
          "extraction, causal analysis, citation verification, drafting, and unsupported-claim review.",
        "Links every factual claim to immutable source lines or labels it as an assumption; " +
          "a separate falsifier challenges proposed root causes with counter-evidence.",
        "Keeps the human responsible for the final root-cause conclusion and preserves " +
          "superseding conclusions as an audit trail.",
        "Includes deterministic citation checks, realistic incident scenarios, an evaluation " +
          "harness, bounded model costs, and end-to-end Playwright coverage.",
      ],
    },
    {
      name: "Executive Intelligence Copilot",
      repo: "github.com/sdv1708/intelligence_copilot",
      status: "featured",
      role: "Creator",
      technologies: [
        "Python",
        "LangChain",
        "LangGraph",
        "FAISS",
        "SentenceTransformers",
        "SQLite",
        "Streamlit",
      ],
      description:
        "A document-intelligence system that ingests meeting materials and produces " +
        "source-grounded executive briefs through retrieval, synthesis, and persistent " +
        "cross-meeting memory.",
      highlights: [
        "Processes PDF, DOCX, PPTX, and text inputs into stable, persisted chunks and FAISS " +
          "vectors with source citations.",
        "Uses specialized ingestion, recall, synthesis, and memory responsibilities to " +
          "generate structured briefs and answer questions over meeting evidence.",
        "Supports multiple LLM providers, versioned SQLite history, exports, and retrieval " +
          "repair tooling for keeping vector and relational data consistent.",
        "Actively hardened with typed configuration, forward-only migrations, deterministic " +
          "test doubles, and more than 200 automated tests.",
      ],
    },
    {
      name: "Overrun Advisor",
      repo: "github.com/sdv1708/project-overrun-advisor",
      status: "featured",
      role: "Creator",
      technologies: [
        "Python",
        "XGBoost",
        "Scikit-learn",
        "SHAP",
        "Streamlit",
        "Pytest",
      ],
      description:
        "A reproducible ML system that forecasts software-project effort variance, explains " +
        "individual predictions with SHAP, and converts the strongest risk signals into " +
        "concrete mitigation advice.",
      highlights: [
        "Packages data preparation, feature engineering, training, evaluation, explanation, " +
          "and advice generation as reusable Python modules behind a thin Streamlit UI.",
        "Measures performance only against held-out real projects and documents that the " +
          "available dataset contains too few true overruns for broad production claims.",
        "Evaluates synthetic augmentation across repeated splits and disables harmful " +
          "configurations instead of presenting inflated results.",
        "Provides reproducible CLI training, persisted metrics, SHAP visualizations, and more " +
          "than 50 network-free tests.",
      ],
    },
    {
      name: "Concurrent Reservation API",
      repo: "github.com/sdv1708/concurrent-reservation",
      status: "featured",
      role: "Creator",
      technologies: [
        "FastAPI",
        "SQLAlchemy",
        "PostgreSQL",
        "Stripe",
        "JWT",
        "Pytest",
      ],
      description:
        "An Airbnb-style reservation backend focused on transaction integrity when multiple " +
        "users attempt to reserve the same limited inventory.",
      highlights: [
        "Uses database-level pessimistic locking and transactional service methods to prevent " +
          "double booking under concurrent requests.",
        "Models reservation, payment-pending, confirmed, and cancelled states explicitly " +
          "instead of hiding booking transitions inside route handlers.",
        "Implements JWT authentication, role-based authorization, hotel and inventory " +
          "management, Stripe payments, and signature-verified asynchronous webhooks.",
        "Keeps HTTP routing separate from business services and covers state transitions, " +
          "database behavior, and webhook handling with integration tests.",
      ],
    },
    {
      name: "Portfolio Shell",
      repo: "github.com/sdv1708/portfolio-shell",
      status: "featured",
      role: "Creator",
      technologies: [
        "TypeScript",
        "Vite",
        "Cloudflare Workers",
        "Workers AI",
        "Gemini Nano",
        "WebLLM",
      ],
      description:
        "A framework-free terminal portfolio with a custom DOM terminal emulator and an AI " +
        "assistant that remains usable across edge, on-device, and offline environments.",
      highlights: [
        "Implements terminal input, cursor rendering, command history, tab completion, themes, " +
          "streaming output, and selectable terminal content without xterm.js.",
        "Selects Gemini Nano when available, otherwise Cloudflare Workers AI, with offline " +
          "profile Q&A as the final automatic fallback.",
        "Offers an explicit WebLLM mode for visitors who choose to download and run a local " +
          "model through WebGPU.",
        "Deploys the static application and AI endpoint together through a Cloudflare Worker " +
          "and GitHub Actions.",
      ],
    },
    {
      name: "EvalTrust",
      repo: "github.com/k-dickinson/evaltrust",
      status: "open-source",
      role: "Open-source contributor",
      links: [
        {
          label: "merged LangSmith adapter PR #62",
          url: "https://github.com/k-dickinson/evaltrust/pull/62",
        },
        {
          label: "merged Ragas adapter PR #77",
          url: "https://github.com/k-dickinson/evaltrust/pull/77",
        },
      ],
      technologies: ["Python", "Pytest", "LangSmith", "Ragas", "LLM Evaluation"],
      description:
        "An open-source auditor for determining whether LLM evaluation results have enough " +
        "statistical evidence to support model-selection and release decisions.",
      highlights: [
        "Contributed the merged LangSmith run-export adapter, including structural format " +
          "detection, multi-metric score parsing, skipped-row handling, registry integration, " +
          "documentation, and tests.",
        "Contributed the merged Ragas result-export adapter for faithfulness, answer relevancy, " +
          "context precision, and related RAG evaluation metrics.",
        "Both contributions let users audit native evaluation exports without first reshaping " +
          "them into a generic CSV format.",
      ],
    },
    {
      name: "Clinical Decision Support System",
      repo: "github.com/sdv1708/Diagnostic-Stack",
      status: "in-progress",
      role: "Creator",
      technologies: ["Google ADK", "Gemini", "A2A", "MCP", "RAG", "Cloud Run"],
      description:
        "An in-progress multi-agent clinical decision-support prototype that coordinates " +
        "symptom intake and laboratory interpretation to draft ranked differential diagnoses.",
      highlights: [
        "Uses a coordinator pattern to delegate intake and laboratory synthesis to specialist " +
          "agents rather than relying on one unconstrained prompt.",
        "Includes tool interfaces, responsible-AI guardrails, observability, evaluation " +
          "scaffolding, and deployment infrastructure.",
        "Targets eval-gated CI/CD so response-quality regressions can block releases.",
      ],
    },
    {
      name: "Distributed Key-Value Store",
      repo: "github.com/sdv1708/distributed-kv-store",
      status: "in-progress",
      role: "Creator",
      technologies: [
        "Python",
        "LSM Trees",
        "Write-Ahead Logging",
        "Consistent Hashing",
        "Vector Clocks",
      ],
      description:
        "An in-progress distributed-systems project designed to build a durable LSM-tree " +
        "storage engine first, then add Dynamo-style partitioning, replication, quorums, and " +
        "conflict detection.",
      highlights: [
        "The planned single-node engine covers a write-ahead log, memtable, immutable SSTables, " +
          "Bloom filters, compaction, and tombstone-based deletion.",
        "The distributed design covers consistent hashing with virtual nodes, N/W/R quorums, " +
          "replication, and vector-clock sibling resolution.",
        "Currently in the design phase with a domain glossary, product brief, and architecture " +
          "decision records; implementation has not started.",
      ],
    },
    {
      name: "GPT from Scratch",
      repo: "github.com/sdv1708/gpt-scratch",
      status: "in-progress",
      role: "Creator",
      technologies: ["Python", "PyTorch"],
      description:
        "An in-progress bottom-up implementation of neural-network and transformer " +
        "fundamentals, beginning with manually derived gradients before introducing PyTorch.",
      highlights: [
        "Implements gradient descent, activations, numerically stable softmax and loss " +
          "functions, explicit backpropagation, multilayer perceptrons, and weight initialization.",
        "Implements LayerNorm, BatchNorm, and RMSNorm with attention to training and inference " +
          "behavior.",
        "Attention, transformer blocks, tokenization, training, and autoregressive generation " +
          "remain on the roadmap and are not presented as complete.",
      ],
    },
    {
      name: "Curb-IQ",
      repo: "github.com/sdv1708/curb-IQ",
      status: "additional",
      role: "Creator",
      technologies: ["Python", "Scikit-learn", "Streamlit", "BigQuery", "Replicate"],
      description:
        "A dynamic parking-management prototype that predicts Seattle parking prices from " +
        "occupancy and time patterns, then applies demand-aware surge-pricing rules.",
      highlights: [
        "Uses roughly one million public SDOT occupancy records with temporal, location, and " +
          "occupancy-rate feature engineering.",
        "Combines a training pipeline, simulated streaming, an interactive dashboard, BigQuery " +
          "persistence, and a hosted inference endpoint.",
      ],
    },
    {
      name: "Predictive Pantry",
      repo: "github.com/sdv1708/predictive-pantry",
      status: "additional",
      role: "Creator",
      technologies: ["Python", "Pandas", "Scikit-learn", "SHAP", "Jupyter"],
      description:
        "An Instacart market-basket analysis that predicts which previously purchased products " +
        "a customer is likely to reorder.",
      highlights: [
        "Explores more than three million grocery orders and engineers behavioral features " +
          "around basket position, order cadence, departments, and aisles.",
        "Compares interpretable and ensemble classifiers and uses SHAP to identify the strongest " +
          "drivers of repeat purchasing.",
      ],
    },
    {
      name: "Literacy Insights",
      repo: "github.com/sdv1708/literacy-insights",
      status: "additional",
      role: "Creator",
      technologies: [
        "Python",
        "Pandas",
        "Statsmodels",
        "Scikit-learn",
        "Jupyter",
      ],
      description:
        "A global education analysis that studies the socioeconomic predictors of adult " +
        "literacy while treating multicollinearity as a first-class modeling problem.",
      highlights: [
        "Uses OLS diagnostics and variance inflation factors to expose unstable coefficients " +
          "before comparing Ridge, Lasso, random forest, and gradient-boosting alternatives.",
        "Connects the resulting feature importance to education access, fertility, technology, " +
          "and policy-oriented interpretation.",
      ],
    },
  ],
  experience: [
    {
      company: "Virtual Gold",
      title: "Software Engineer - AI",
      dates: "Jun 2026 - Present",
      location: "Remote, USA",
      achievements: [
        "Architected a secure hybrid on-premises/cloud multi-agent system with intelligent " +
          "model routing across Llama 3.3 70B through Ollama and vLLM plus cloud LLMs, using " +
          "MCP-based tool calling for confidential financial workflows.",
        "Developed a RAG pipeline using Pinecone, FastAPI, Serper, and NetworkX to analyze " +
          "10-K and 10-Q filings, retrieve real-time market data, and map entity relationships " +
          "for market and competitive intelligence.",
      ],
    },
    {
      company: "Connyct - CampusAI",
      title: "Software Engineer Intern - AI",
      dates: "Sep 2025 - Dec 2025",
      location: "New York, USA",
      achievements: [
        "Built and deployed a production LLM recommendation service on AWS ECS using Amazon " +
          "Bedrock, RAG, Elasticsearch vector retrieval, Redis caching, and multi-signal " +
          "ranking for scalable personalized recommendations.",
        "Designed a DeepEval-based LLM evaluation framework measuring hallucination, relevance, " +
          "groundedness, and latency, then integrated regression thresholds into CI/CD to " +
          "prevent quality-degrading model and prompt releases.",
      ],
    },
    {
      company: "UMD Community Preservation Trust",
      title: "Software Development Engineer",
      dates: "Feb 2025 - Dec 2025",
      location: "Maryland, USA",
      achievements: [
        "Led backend architecture and frontend integration for a multi-tenant rental platform " +
          "serving 15K+ users, developing 25+ Flask REST APIs and secure React workflows with " +
          "JWT authentication and RBAC for applicant and administrator access.",
      ],
    },
    {
      company: "IQVIA (Fortune 250)",
      title: "Software Development Engineer - AI and Backend",
      dates: "Mar 2022 - Jul 2024",
      location: "North Carolina, USA",
      achievements: [
        "Built and deployed an Azure-based LLM document-intelligence application using " +
          "GPT-3.5, Azure Functions, and Blob Storage, improving structured extraction " +
          "accuracy from 55% to 95% across regulatory documents.",
        "Developed an Airflow-orchestrated document-processing pipeline using OCR, regex " +
          "validation, and confidence-based routing, reducing unnecessary Donut inference by " +
          "30% while improving processing efficiency and reliability.",
        "Designed event-driven backend services using Azure Service Bus topics, queues, and " +
          "worker services, processing 3K+ JSON messages per second with retries and " +
          "dead-letter handling.",
        "Built FastAPI and SQLAlchemy REST APIs over 100K+ monthly PostgreSQL-compatible " +
          "payment records, delivering transaction aggregates, outstanding balances, and " +
          "revenue KPIs to operations teams.",
      ],
    },
  ],
  education: [
    {
      degree: "Master of Science in Information Systems",
      institution: "University of Maryland, Robert H. Smith School of Business",
      graduation: "Dec 2025",
    },
    {
      degree: "Bachelor of Science in Electronics Engineering",
      institution: "PES University",
      graduation: "May 2022",
    },
  ],
};
