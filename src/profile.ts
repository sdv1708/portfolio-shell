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
  context?: string;
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
  updatedAt: "2026-11-26",
  fullName: "Sanjay Dari Veerabasappa",
  preferredName: "Sanjay",
  headline: "Backend + AI engineer",
  location: "Chicago, IL",
  summary:
    "Backend and AI engineer building hybrid model routing and financial research " +
    "workflows at Virtual Gold. Experienced in production RAG, LLM evaluation, document " +
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
      name: "Performance & Quality Lab",
      repo: "github.com/sdv1708/ai-model-benchmark",
      status: "featured",
      role: "Creator",
      links: [
        {
          label: "live Performance Studio",
          url: "https://ai-model-quality-challenge-rho.vercel.app/",
        },
        {
          label: "recorded benchmark results",
          url: "https://github.com/sdv1708/ai-model-benchmark/blob/main/docs/results.md",
        },
        {
          label: "EvalScope pruning extension",
          url: "https://github.com/sdv1708/evalscope-pruning",
        },
      ],
      technologies: [
        "Python",
        "FastAPI",
        "React",
        "TypeScript",
        "EvalScope",
        "Playwright",
      ],
      description:
        "A model-selection lab with a live app for comparing inference-performance " +
        "projections and a separate research pipeline for testing cheaper benchmark decisions.",
      highlights: [
        "Built Performance Studio to compare Excel projections on matching workload " +
          "configurations and explain GO, NO GO, or NEEDS DATA decisions across throughput, " +
          "latency, context, and cost. Analyzed 77 workbooks across 11 anonymous models.",
        "Replayed a frozen two-stage policy on 28 public LiveCodeBench models. A 63-of-315 " +
          "question probe with full-set fallback averaged 43.3% of estimated full-run tokens " +
          "across 61 thresholds.",
        "In a 1,055-question follow-up at a 0.70 threshold, the 211-question probe made " +
          "82.7% of decisions on its own. With fallback, the policy used 33.8% of the questions " +
          "on average and made one wrong decision in 28,000 offline decisions.",
        "Reconstructed six full benchmark scores from saved grades and built native " +
          "LiveCodeBench and AA-LCR pruning adapters for EvalScope. The tested fixed subsets " +
          "failed at least one score-estimation gate, so both adapters default to full retention.",
        "Regraded 300 saved AA-LCR answers five times to measure judge repeatability and " +
          "checked how a prompt change shifted verdicts. The published cost figures come " +
          "from offline replay and use estimated tokens or question counts.",
      ],
    },
    {
      name: "Postmortem Agent",
      repo: "github.com/sdv1708/postmortem",
      status: "featured",
      role: "Creator",
      links: [
        {
          label: "multi-pass evaluation and baseline",
          url: "https://github.com/sdv1708/postmortem/pull/52",
        },
        {
          label: "results and engineering retrospective",
          url: "https://github.com/sdv1708/postmortem/blob/main/docs/LEARNINGS.md",
        },
      ],
      technologies: [
        "FastAPI",
        "Next.js",
        "TypeScript",
        "SQLAlchemy",
        "PostgreSQL",
        "Playwright",
      ],
      description:
        "An incident review application that turns logs, traces, and deployment notes into " +
        "a cited draft and lets a human finalize the root cause.",
      highlights: [
        "Built a six-stage pipeline with immutable, line-addressable evidence, exact quote " +
          "checks, and separate claim-support verification. Unsupported claims are labeled " +
          "as assumptions.",
        "A separate falsifier challenges candidate causes with counterevidence and gaps. " +
          "A human finalizes the conclusion and can later append a superseding one.",
        "Compared multi-pass reasoning with a builder-only baseline. On the recorded " +
          "deploy-ambiguity fixture, multi-pass passed all 13 checks in 10 recorded calls. " +
          "The five-call baseline missed challenge and counterevidence coverage.",
        "Reordered the falsifier prompt to reuse an evidence prefix. A live tuning run " +
          "recorded 2,304 cached falsifier tokens, up from zero in the baseline run.",
      ],
    },
    {
      name: "Executive Intelligence Copilot",
      repo: "github.com/sdv1708/intelligence-copilot",
      status: "featured",
      role: "Creator",
      links: [
        {
          label: "FastAPI and React migration",
          url: "https://github.com/sdv1708/intelligence-copilot/pull/5",
        },
        {
          label: "pasted-note identity and retry",
          url: "https://github.com/sdv1708/intelligence-copilot/pull/6",
        },
      ],
      technologies: [
        "Python",
        "FastAPI",
        "React",
        "TypeScript",
        "LangGraph",
        "FAISS",
        "SQLite",
      ],
      description:
        "A meeting intelligence app that turns uploaded documents and notes into cited " +
        "executive briefs, open actions, timed agendas, and follow-up Q&A.",
      highlights: [
        "Runs topic-specific LangGraph searches in parallel against a per-meeting FAISS " +
          "index. The brief and Q&A show source citations and traces, including specialist " +
          "findings and failed inquiries.",
        "Migrated Streamlit to FastAPI and React with a typed client, versioned SQLite brief " +
          "history, JSON and Markdown exports, and recurring action items carried forward " +
          "when meeting titles match.",
        "Uses stable SQLite chunk IDs as FAISS vector IDs and a per-meeting lock to serialize " +
          "index writes, deletions, and retrieval backfill.",
        "Gives each pasted note a separate ID and preserves title and text after failed " +
          "ingestion so the user can retry. The merged slice recorded 440 passing backend " +
          "tests and a browser check.",
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
      links: [
        {
          label: "merged Stay Inventory refactor",
          url: "https://github.com/sdv1708/concurrent-reservation/pull/1",
        },
        {
          label: "passing PostgreSQL CI run",
          url: "https://github.com/sdv1708/concurrent-reservation/actions/runs/44661911551",
        },
        {
          label: "expired-hold handling PR",
          url: "https://github.com/sdv1708/concurrent-reservation/pull/3",
        },
      ],
      technologies: [
        "FastAPI",
        "SQLAlchemy",
        "PostgreSQL",
        "Stripe",
        "JWT",
        "Pytest",
      ],
      description:
        "A hotel booking API that coordinates nightly inventory holds and Stripe payment " +
        "confirmation under concurrent requests.",
      highlights: [
        "Centralized stay availability and count changes in a Stay Inventory module. " +
          "PostgreSQL locks every occupied night in date order before checking capacity, " +
          "and the hold and booking commit together.",
        "Locks the booking row during Stripe confirmation so duplicate deliveries cannot " +
          "book rooms twice. Added a dry-run, idempotent repair for legacy checkout-night counts.",
        "Verified the last-room race and concurrent repair against PostgreSQL 16 in a passing " +
          "workflow on the open CI PR.",
        "A separate open PR adds expired-hold release and late Stripe payment handling. " +
          "The merged API includes role-based access, inventory management, and dynamic pricing.",
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
        "Merged LangSmith PR #62 imports run exports, uses reference example IDs for pairing, " +
          "and averages available feedback scores per example.",
        "Merged Ragas PR #77 imports result exports, recognizes known metrics such as faithfulness " +
          "and context precision, and averages usable values per row.",
        "Integrated detection ahead of generic adapters and added tests for routing, format " +
          "collisions, skipped rows, and empty exports. Users can compare two native exports " +
          "through the existing CLI.",
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
      links: [
        {
          label: "write-ahead log and crash recovery PR",
          url: "https://github.com/sdv1708/distributed-kv-store/pull/14",
        },
        {
          label: "storage and distributed design",
          url: "https://github.com/sdv1708/distributed-kv-store/issues/1",
        },
      ],
      technologies: [
        "Python",
        "Write-Ahead Logging",
        "CRC32",
        "Hypothesis",
        "Pytest",
      ],
      description:
        "A working durable single-node key-value engine in Python, built as the foundation " +
        "for a distributed store.",
      highlights: [
        "Implemented a byte-oriented get/put/delete API and kvctl CLI. A single writer appends " +
          "each mutation to a CRC32-checked WAL before it changes the memtable.",
        "Replays intact records and truncates a damaged tail on startup. Tested recovery " +
          "after forcibly killing the CLI in all three fsync modes and checked randomized " +
          "writes, deletes, and restarts against a dictionary with Hypothesis.",
        "Documented the next storage milestones (SSTables, Bloom filters, and compaction) " +
          "and the distributed design for consistent hashing, replication, quorums, and " +
          "vector-clock conflict resolution.",
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
      name: "Data Structures & Algorithms",
      repo: "github.com/sdv1708/data-structures-algorithms",
      status: "additional",
      technologies: ["Python", "NeetCode"],
      description:
        "A synced archive of 349 Python submissions across 145 algorithm problems. " +
        "Eighty-two problems have multiple saved submissions.",
      highlights: [
        "Practiced graph traversal and dependency analysis, dynamic programming, backtracking, " +
          "heaps, binary search, and from-scratch hash tables.",
        "Combined trie prefix pruning with board DFS in Word Search II and used layered " +
          "leaf removal to find the roots of minimum-height trees.",
        "Compared memoized search with bottom-up knapsack in Last Stone Weight II and " +
          "reachable-sum sets with a two-dimensional table in Partition Equal Subset Sum.",
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
      dates: "Aug 2026 - Present",
      location: "Remote, USA",
      achievements: [
        "Prototyped a FastAPI orchestration layer that routes confidential workflows between " +
          "self-hosted Llama 3.3 70B via Ollama and vLLM and cloud LLMs, with MCP tool calls.",
        "Built a financial and competitive research workflow combining 10-K and 10-Q filings, " +
          "live market data, Pinecone retrieval, Serper search, and NetworkX entity relationships.",
      ],
    },
    {
      company: "Connyct - CampusAI",
      title: "Software Engineer Intern - AI",
      dates: "Sep 2025 - Dec 2025",
      location: "New York, USA",
      achievements: [
        "Built an AWS recommendation workflow with Amazon Bedrock, Elasticsearch vector retrieval, " +
          "Redis caching, and multi-signal ranking. It met the sub-two-second target in team testing.",
        "Established the initial evaluation pipeline with about 30 reference examples, DeepEval " +
          "checks for relevance, groundedness, hallucination risk, latency, and cost, and CI/CD " +
          "regression gates.",
      ],
    },
    {
      company: "UMD Community Preservation Trust",
      title: "Software Development Engineer",
      dates: "Feb 2025 - Dec 2025",
      location: "College Park, Maryland, USA",
      achievements: [
        "Led backend development and React integration for a rental and administration portal " +
          "designed for a 15K+ member university community. Built Flask and MySQL services with " +
          "JWT authentication and role-based access for applicants and administrators.",
        "Worked with the client on new features and deployment as the portal digitized " +
          "paper and email workflows.",
      ],
    },
    {
      company: "IQVIA (Fortune 250)",
      title: "Software Development Engineer - AI and Backend",
      dates: "Mar 2022 - Jul 2024",
      location: "North Carolina, USA",
      context:
        "IQVIA Regulatory Intelligence covers 350K+ regulatory documents across 110+ countries, " +
        "regions, and international organizations.",
      achievements: [
        "Improved regulatory Q&A extraction accuracy from approximately 55% to 95% by " +
          "integrating GPT-3.5 with Azure Functions and Blob Storage.",
        "Added document eligibility rules, contributed to Elasticsearch search and export, " +
          "and streamed historical documents to Azure Blob Storage in chunks to bound memory use.",
        "For the payments platform, added OCR and rules-based routing to an Airflow pipeline. " +
          "About 30% of tested documents could skip Donut inference.",
        "Built Azure Service Bus components with retries and dead-letter handling and a webhook " +
          "that triggered downstream extraction after digitization. Observed throughput reached " +
          "roughly 3K messages per second.",
        "Built FastAPI and SQLAlchemy services backed by PostgreSQL for roughly 100K monthly " +
          "payment records, delivering transaction totals, outstanding balances, and revenue KPIs.",
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
