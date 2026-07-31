import type { PasswordRequirements } from "$lib/types";

/**
 * The password rules ASP.NET Core Identity enforces, named with the exact codes
 * the API reports in a rejection's `failedRequirements` — so a refusal marks
 * checklist rows directly, with no second lookup table to keep in step.
 *
 * Identity's set is closed, but only four are reachable under the policy the
 * API currently serves: it asks for no symbol and for one unique character,
 * which any non-empty password already has.
 */
export type PasswordRuleKey =
  | "PasswordTooShort"
  | "PasswordRequiresLower"
  | "PasswordRequiresUpper"
  | "PasswordRequiresDigit"
  | "PasswordRequiresNonAlphanumeric"
  | "PasswordRequiresUniqueChars";

/** One checklist row: what the policy asks for, and whether it is met yet. */
export interface PasswordRule {
  key: PasswordRuleKey;
  label: string;
  isSatisfied: boolean;
}

/**
 * Identity's validator compares against the ASCII ranges its own messages quote
 * — `'a'-'z'`, `'A'-'Z'`, `'0'-'9'` — not Unicode letter categories. These tests
 * mirror that deliberately: to Identity `Å` is not an uppercase letter and does
 * count as a symbol, and a checklist more generous than the server would leave
 * the user staring at an all-green list next to a rejection.
 */
const hasLowercase = (password: string) => /[a-z]/.test(password);
const hasUppercase = (password: string) => /[A-Z]/.test(password);
const hasDigit = (password: string) => /[0-9]/.test(password);
const hasNonAlphanumeric = (password: string) => /[^a-zA-Z0-9]/.test(password);

/** Distinct UTF-16 units, matching Identity's `password.Distinct().Count()`. */
const uniqueCharacterCount = (password: string) =>
  new Set(password.split("")).size;

const minimumLength = (requirements: PasswordRequirements) =>
  requirements.minimumLength ?? 0;

const requiredUniqueCharacters = (requirements: PasswordRequirements) =>
  requirements.requiredUniqueChars ?? 0;

interface RuleDefinition {
  key: PasswordRuleKey;
  /** Whether the configured policy actually asks for this. */
  isDemanded: (requirements: PasswordRequirements) => boolean;
  describe: (requirements: PasswordRequirements) => string;
  isSatisfiedBy: (
    password: string,
    requirements: PasswordRequirements,
  ) => boolean;
}

/** In the order they read best as a list, not the order Identity reports them. */
const RULE_DEFINITIONS: RuleDefinition[] = [
  {
    key: "PasswordTooShort",
    isDemanded: (requirements) => minimumLength(requirements) > 0,
    describe: (requirements) => `Minst ${minimumLength(requirements)} tegn`,
    isSatisfiedBy: (password, requirements) =>
      password.length >= minimumLength(requirements),
  },
  {
    key: "PasswordRequiresLower",
    isDemanded: (requirements) => !!requirements.requireLowercase,
    describe: () => "Minst én liten bokstav (a–z)",
    isSatisfiedBy: hasLowercase,
  },
  {
    key: "PasswordRequiresUpper",
    isDemanded: (requirements) => !!requirements.requireUppercase,
    describe: () => "Minst én stor bokstav (A–Z)",
    isSatisfiedBy: hasUppercase,
  },
  {
    key: "PasswordRequiresDigit",
    isDemanded: (requirements) => !!requirements.requireDigit,
    describe: () => "Minst ett tall (0–9)",
    isSatisfiedBy: hasDigit,
  },
  {
    key: "PasswordRequiresNonAlphanumeric",
    isDemanded: (requirements) => !!requirements.requireNonAlphanumeric,
    describe: () => "Minst ett spesialtegn (for eksempel !, ? eller #)",
    isSatisfiedBy: hasNonAlphanumeric,
  },
  {
    // At 1 this can only fail for an empty password, which the length rule
    // already covers — so the row would be permanent noise. Shown from 2 up.
    key: "PasswordRequiresUniqueChars",
    isDemanded: (requirements) => requiredUniqueCharacters(requirements) > 1,
    describe: (requirements) =>
      `Minst ${requiredUniqueCharacters(requirements)} ulike tegn`,
    isSatisfiedBy: (password, requirements) =>
      uniqueCharacterCount(password) >= requiredUniqueCharacters(requirements),
  },
];

const KNOWN_RULE_KEYS = new Set<string>(
  RULE_DEFINITIONS.map((definition) => definition.key),
);

/**
 * The policy as checklist rows, each already tested against `password`. Rules
 * the policy does not ask for are left out entirely, so the list shows only
 * what the user actually has to satisfy.
 */
export function evaluatePassword(
  password: string,
  requirements: PasswordRequirements,
): PasswordRule[] {
  return RULE_DEFINITIONS.filter((definition) =>
    definition.isDemanded(requirements),
  ).map((definition) => ({
    key: definition.key,
    label: definition.describe(requirements),
    isSatisfied: definition.isSatisfiedBy(password, requirements),
  }));
}

/**
 * Whether `password` clears the policy client-side, for gating a save button.
 *
 * With no policy loaded the fetch failed, so this only insists on a non-empty
 * password and leaves the verdict to the API — better a wasted round-trip than
 * a Lagre button the user has no way to enable. Blank is never acceptable;
 * where a blank password is meaningful (the user editor, where it keeps the
 * current one) the caller checks for that before asking.
 */
export function isPasswordAcceptable(
  password: string,
  requirements: PasswordRequirements | null,
): boolean {
  if (!password) return false;
  if (!requirements) return true;
  return evaluatePassword(password, requirements).every(
    (rule) => rule.isSatisfied,
  );
}

/** The API's `PasswordRequirementsNotMetError`, narrowed to what the UI uses. */
export interface PasswordRejection {
  /** The rules the API refused on. Empty if it named none we recognise. */
  failedRules: PasswordRuleKey[];
  /** The policy it enforced — echoed back on every rejection. */
  requirements: PasswordRequirements | null;
}

const REJECTION_TYPE = "PasswordRequirementsNotMetError";

const REQUIREMENT_FIELDS = [
  "minimumLength",
  "requireDigit",
  "requireUppercase",
  "requireLowercase",
  "requireNonAlphanumeric",
  "requiredUniqueChars",
] as const;

/**
 * Narrows an untyped body to a policy. The endpoint leaves its response
 * undefined in the OpenAPI document, so what comes back is trusted only once at
 * least one policy field is present — and a rejection echoes the policy back
 * inside a larger body, which this reads just the same.
 */
export function asPasswordRequirements(
  value: unknown,
): PasswordRequirements | null {
  if (!value || typeof value !== "object") return null;
  const hasPolicyField = REQUIREMENT_FIELDS.some((field) => field in value);
  return hasPolicyField ? (value as PasswordRequirements) : null;
}

/**
 * Reads a failed write's body as a password rejection, or null when it failed
 * for some other reason. Consumes the body, so call it only on a response
 * nothing else will read.
 *
 * Codes outside Identity's set are dropped rather than shown raw — they would
 * render as a row we have no Norwegian text for. A rejection naming only
 * unknown codes therefore comes back with empty `failedRules`, which callers
 * fall back on as a generic failure.
 */
export async function readPasswordRejection(
  response: Response,
): Promise<PasswordRejection | null> {
  const body: unknown = await response.json().catch(() => null);
  if (!body || typeof body !== "object") return null;

  const problem = body as Record<string, unknown>;
  if (problem.type !== REJECTION_TYPE) return null;

  const reportedCodes = Array.isArray(problem.failedRequirements)
    ? problem.failedRequirements
    : [];

  return {
    failedRules: reportedCodes.filter(
      (code): code is PasswordRuleKey =>
        typeof code === "string" && KNOWN_RULE_KEYS.has(code),
    ),
    requirements: asPasswordRequirements(problem.requirements),
  };
}
