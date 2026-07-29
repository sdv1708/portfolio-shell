// Offline, last-resort Q&A. Pure string matching over the questions visitors
// actually ask — no model, no network, instant, works in every browser.
// Used when neither Gemini Nano nor Cloudflare Workers AI is reachable.

import { PROFILE } from "./profile.ts";

interface Entry {
  keywords: string[][]; // matches if ANY group has ALL its words present
  answer: string;
}

const skillSummary = PROFILE.skills
  .map((group) => `${group.label}: ${group.items.join(", ")}`)
  .join(". ");

const experienceSummary = PROFILE.experience
  .map((role) => `${role.title} at ${role.company} (${role.dates})`)
  .join("; ");

const projectSummary = PROFILE.projects
  .map((project) => `${project.name} [${project.status}]`)
  .join("; ");

const iqviaSummary = PROFILE.experience
  .filter((role) => role.company.includes("IQVIA"))
  .map(
    (role) =>
      `${role.title} (${role.dates}): ${role.achievements.join(" ")}`,
  )
  .join(" ");

const contactSummary = PROFILE.contacts
  .map((contact) => `${contact.label}: ${contact.value}`)
  .join(", ");

const educationSummary = PROFILE.education
  .map(
    (education) =>
      `${education.degree}, ${education.institution} (${education.graduation})`,
  )
  .join("; ");

const currentRole = PROFILE.experience[0];

const ENTRIES: Entry[] = [
  {
    keywords: [["current role"], ["work now"], ["employer"], ["virtual gold"]],
    answer: currentRole
      ? `${PROFILE.preferredName} currently works as ${currentRole.title} at ` +
        `${currentRole.company} (${currentRole.dates}, ${currentRole.location}). ` +
        currentRole.achievements.join(" ")
      : `${PROFILE.preferredName}'s current role is not listed.`,
  },
  {
    keywords: [["experience"], ["years"], ["how long"], ["seniority"]],
    answer: `${PROFILE.preferredName}'s experience includes ${experienceSummary}.`,
  },
  {
    keywords: [["skill"], ["stack"], ["tech"], ["languages"], ["tools"]],
    answer: `Core stack: ${skillSummary}. Type 'skills' for the formatted list.`,
  },
  {
    keywords: [["project"], ["postmortem"], ["built"], ["work on"], ["clinical"], ["copilot"]],
    answer: `Selected work: ${projectSummary} Type 'projects' for the formatted list.`,
  },
  {
    keywords: [["iqvia"]],
    answer: `At IQVIA, ${PROFILE.preferredName} worked as ${iqviaSummary}`,
  },
  {
    keywords: [["contact"], ["email"], ["reach"], ["linkedin"], ["github"], ["hire"]],
    answer: `Contact details: ${contactSummary}.`,
  },
  {
    keywords: [["visa"], ["opt"], ["sponsor"], ["authorization"], ["work permit"]],
    answer:
      `${PROFILE.preferredName} has ${PROFILE.workAuthorization} and is looking for ` +
      `${PROFILE.targetRoles.join(" and ")} roles.`,
  },
  {
    keywords: [["education"], ["degree"], ["study"], ["school"], ["university"], ["umd"], ["masters"]],
    answer: educationSummary,
  },
  {
    keywords: [["who"], ["about"], ["bio"], ["yourself"]],
    answer:
      `${PROFILE.fullName} — ${PROFILE.headline} based in ${PROFILE.location}. ` +
      `${PROFILE.summary} ${PROFILE.workAuthorization}.`,
  },
  {
    keywords: [["location"], ["where"], ["based"], ["city"]],
    answer: `${PROFILE.preferredName} is based in ${PROFILE.location}.`,
  },
];

const FALLBACK =
  `I'm in offline mode right now, so I can only answer common questions about ` +
  `${PROFILE.preferredName}'s ` +
  "experience, skills, projects, education, and contact info. Try asking one of those — or use " +
  "the shell commands: profile, whoami, about, skills, projects, experience, education, contact.";

const PROJECT_MATCH_STOP_WORDS = new Set([
  "advisor",
  "from",
  "project",
  "scratch",
  "shell",
  "store",
  "system",
]);

function projectMatchTerms(name: string, repo: string): string[] {
  const repoName = repo.split("/").pop() ?? "";
  return `${name} ${repoName}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(
      (term) =>
        (term.length >= 4 || term === "gpt" || term === "kv") &&
        !PROJECT_MATCH_STOP_WORDS.has(term),
    );
}

function answerForProject(question: string): string | undefined {
  const compactQuestion = question.replace(/[^a-z0-9]+/g, "");
  const project = PROFILE.projects.find((candidate) => {
    const compactName = candidate.name.toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (compactName.length >= 4 && compactQuestion.includes(compactName)) {
      return true;
    }
    return projectMatchTerms(candidate.name, candidate.repo).some((term) =>
      question.includes(term),
    );
  });
  if (!project) return undefined;

  const status =
    project.status === "open-source"
      ? `an open-source project where ${PROFILE.preferredName} is an ${project.role?.toLowerCase() ?? "contributor"}`
      : project.status === "in-progress"
        ? "an in-progress project"
        : project.status === "additional"
          ? "an additional portfolio project"
          : "a featured project";

  return `${project.name} is ${status}. ${project.description} ${project.highlights
    .slice(0, 2)
    .join(" ")}`;
}

export function answerFromFaq(question: string): string {
  const q = question.toLowerCase();
  const projectAnswer = answerForProject(q);
  if (projectAnswer) return projectAnswer;

  for (const entry of ENTRIES) {
    for (const group of entry.keywords) {
      if (group.every((word) => q.includes(word))) {
        return entry.answer;
      }
    }
  }
  return FALLBACK;
}
