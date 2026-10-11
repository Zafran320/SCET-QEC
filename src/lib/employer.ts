import { Department } from "./questions";

export const EMPLOYER_QUESTIONS: string[] = [
  "Ability to transform the knowledge and skills into practical work.",
  "Problem understanding / solving skills.",
  "Collection and analyzing appropriate data.",
  "Shows keen interest in learning new concepts.",
  "Professional and general ethical standards.",
  "Social Interaction.",
  "Is reliable and self-disciplined.",
  "Ability to motivate others to meet goals.",
  "Possesses communication skills.",
  "Ability to work with other colleagues.",
  "Ability to meet the goals on time.",
];

/** How the employer identifies the organization: typed name + address, or a company stamp image. */
export type OrgMode = "details" | "stamp";

export interface EmployerRecord {
  id?: string;
  created_at?: string;
  employee_name: string;
  employee_designation: string;
  department: Department;
  employer_name: string;
  employer_designation: string;
  org_mode: OrgMode;
  organization_name: string; // empty when org_mode is "stamp"
  address: string; // empty when org_mode is "stamp"
  stamp: string | null; // PNG data URL with transparent background, only when org_mode is "stamp"
  email: string;
  ratings: number[];
}
