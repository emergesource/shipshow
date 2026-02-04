// System audience templates
// These are pre-defined audiences users can quickly add to their account

export interface SystemAudienceTemplate {
  id: string;
  name: string;
  description: string;
}

export const SYSTEM_AUDIENCE_TEMPLATES: SystemAudienceTemplate[] = [
  {
    id: "cto",
    name: "CTO",
    description: "Technical leadership focused on architecture, technical decisions, and engineering strategy"
  },
  {
    id: "client",
    name: "Client",
    description: "External stakeholder interested in project progress, deliverables, and outcomes"
  },
  {
    id: "manager",
    name: "Manager",
    description: "Direct manager needing tactical updates on progress, blockers, and next steps"
  },
  {
    id: "team",
    name: "Team",
    description: "Fellow developers interested in technical implementation details and code changes"
  },
  {
    id: "executive",
    name: "Executive",
    description: "C-suite leadership focused on strategic progress, business impact, and high-level milestones"
  },
  {
    id: "investors",
    name: "Investors",
    description: "Financial stakeholders tracking key milestones, progress, and business outcomes"
  }
];
