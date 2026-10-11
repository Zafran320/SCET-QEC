export const QUESTIONS: string[] = [
  "Appropriateness of attained knowledge and skills with respect to your current work position.",
  "Capability of analyzing and problem-solving skills.",
  "Usage of computer tools in solving engineering problems.",
  "Awareness regarding the ethical values and your responsibilities towards society.",
  "Improving the knowledge and skills by attending the seminars/workshops after graduation.",
  "Eagerness to pursue opportunities like higher education, PG diplomas and practicing innovative ideas etc.",
  "Ability to communicate effectively with seniors, juniors, and general public.",
  "Working as a team member / leader in the field.",
  "Skills and capabilities to manage the assigned tasks",
];

// Max submissions per ZIP download (keeps the ZIP far below Vercel's 4.5 MB response limit)
export const BATCH_SIZE = 10;

export const LEGEND = [
  "1: Poor",
  "2: Fair",
  "3: Good",
  "4: Very Good",
  "5: Excellent",
];

export const DEPARTMENTS = {
  electrical: "Electrical Engineering",
  civil: "Civil Engineering",
  mechanical: "Mechanical Engineering",
  computer_science: "Computer Science",
} as const;
export type Department = keyof typeof DEPARTMENTS;

export const EMPLOYMENT_STATUSES = {
  employed: "Employed",
  self_employed: "Self-employed",
  unemployed: "Unemployed",
} as const;
export type EmploymentStatus = keyof typeof EMPLOYMENT_STATUSES;

export const isDepartment = (v: unknown): v is Department =>
  typeof v === "string" && Object.prototype.hasOwnProperty.call(DEPARTMENTS, v);
export const isEmploymentStatus = (v: unknown): v is EmploymentStatus =>
  typeof v === "string" && Object.prototype.hasOwnProperty.call(EMPLOYMENT_STATUSES, v);

export const departmentLabel = (d: string | null | undefined) =>
  isDepartment(d) ? DEPARTMENTS[d] : "Not set";

export interface FeedbackRecord {
  id?: string;
  created_at?: string;
  updated_at?: string | null;
  name: string;
  reg_no: string;
  grad_year: string;
  email: string;
  cell_no: string;
  department: Department | null; // null only for responses submitted before departments existed
  employment_status: EmploymentStatus;
  ratings: number[];
  comments: string;
  signature: string; // PNG data URL
}
