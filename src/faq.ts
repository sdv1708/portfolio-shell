// Offline, last-resort Q&A. Pure string matching over the questions visitors
// actually ask — no model, no network, instant, works in every browser.
// Used when neither Gemini Nano nor Cloudflare Workers AI is reachable.

interface Entry {
  keywords: string[][]; // matches if ANY group has ALL its words present
  answer: string;
}

const ENTRIES: Entry[] = [
  {
    keywords: [["experience"], ["years"], ["how long"], ["seniority"]],
    answer:
      "Sanjay has 2+ years of production software engineering at IQVIA (Jul 2022–Jul 2024) " +
      "plus three 2025 roles: Connyct CampusAI (AI engineer intern), UMD Community " +
      "Preservation Trust (SDE), and ongoing AI/backend work. Roughly 3 years total across " +
      "backend and AI engineering.",
  },
  {
    keywords: [["skill"], ["stack"], ["tech"], ["languages"], ["tools"]],
    answer:
      "Core stack: Python, Java, SQL across PostgreSQL, MySQL, Redis, Elasticsearch. Backend " +
      "with FastAPI, Flask, microservices, Kafka, Airflow. AI/ML with LLMs, RAG, LangChain, " +
      "LangGraph, PyTorch, DeepEval. Cloud on AWS and Azure with Docker, Kubernetes, CI/CD. " +
      "Type 'skills' for the full list.",
  },
  {
    keywords: [["project"], ["postmortem"], ["built"], ["work on"], ["clinical"], ["copilot"]],
    answer:
      "Selected work: PostMortem AI — a six-stage pipeline with immutable citation validation " +
      "and LLM-as-judge scoring (Python, TypeScript, PostgreSQL, Playwright). Clinical Decision " +
      "Support System — a 3-agent coordinator with RAI guardrails and eval-gated CI/CD (Google " +
      "ADK, Gemini, MCP, RAG). Executive Intelligence Copilot — multi-agent tool-calling " +
      "workflows (LangChain, FAISS). Type 'projects' for details.",
  },
  {
    keywords: [["iqvia"]],
    answer:
      "At IQVIA (SDE, AI & Backend, Jul 2022–Jul 2024, Bangalore): built a GPT-3.5 NLP platform " +
      "on Azure Functions with 95% extraction accuracy, an Airflow invoice pipeline (Tesseract " +
      "→ Donut) that improved throughput 70%, distributed microservices handling 3K+ msgs/sec, " +
      "and FastAPI/PostgreSQL APIs supporting 1.2M+ annual transactions.",
  },
  {
    keywords: [["contact"], ["email"], ["reach"], ["linkedin"], ["github"], ["hire"]],
    answer:
      "Reach Sanjay at sanjaydv@umd.edu, linkedin.com/in/sanjaydv, or github.com/sdv1708. " +
      "Based in Chicago, IL. Type 'contact' for the full card.",
  },
  {
    keywords: [["visa"], ["opt"], ["sponsor"], ["authorization"], ["work permit"]],
    answer:
      "Sanjay is on OPT (US work authorization) and looking for backend / AI engineering roles.",
  },
  {
    keywords: [["education"], ["degree"], ["study"], ["school"], ["university"], ["umd"], ["masters"]],
    answer:
      "MS in Information Systems from UMD's Robert H. Smith School of Business (Dec 2025), and a " +
      "BS in Electronics Engineering from PES University (May 2022).",
  },
  {
    keywords: [["who"], ["about"], ["bio"], ["yourself"]],
    answer:
      "Sanjay Dari Veerabasappa — backend + AI engineer based in Chicago, IL. MS Information " +
      "Systems from UMD, 2+ years production SWE at IQVIA, now building RAG pipelines, multi-agent " +
      "systems, and LLM evaluation. On OPT, looking for backend / AI roles.",
  },
  {
    keywords: [["location"], ["where"], ["based"], ["city"]],
    answer: "Sanjay is based in Chicago, IL.",
  },
];

const FALLBACK =
  "I'm in offline mode right now, so I can only answer common questions about Sanjay's " +
  "experience, skills, projects, education, and contact info. Try asking one of those — or use " +
  "the shell commands: whoami, about, skills, projects, experience, contact.";

export function answerFromFaq(question: string): string {
  const q = question.toLowerCase();
  for (const entry of ENTRIES) {
    for (const group of entry.keywords) {
      if (group.every((word) => q.includes(word))) {
        return entry.answer;
      }
    }
  }
  return FALLBACK;
}
