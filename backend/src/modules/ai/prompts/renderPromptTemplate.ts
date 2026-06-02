// Matches {{key}} and {{ key }} — captures the trimmed key name
const PLACEHOLDER_REGEX = /\{\{\s*(\w+)\s*\}\}/g;

export type RenderPromptVariables = Record<
  string,
  string | number | boolean | null | undefined | object | unknown[]
>;

/**
 * Converts a variable value to its string representation for prompt injection.
 * Objects and arrays are pretty-printed as JSON.
 * null/undefined becomes an empty string.
 */
function valueToString(value: RenderPromptVariables[string]): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

/**
 * Replaces all {{key}} and {{ key }} placeholders in a template string
 * with the corresponding values from the variables map.
 * Missing keys are replaced with an empty string — no error is thrown.
 */
export function renderPromptTemplate(
  template: string,
  variables: RenderPromptVariables,
): string {
  return template.replace(PLACEHOLDER_REGEX, (_match, key: string) => {
    return key in variables ? valueToString(variables[key]) : '';
  });
}

/**
 * Returns the unique list of placeholder names found in the template.
 * Handles both {{key}} and {{ key }} formats.
 */
export function extractPromptVariables(template: string): string[] {
  const found = new Set<string>();
  for (const match of template.matchAll(PLACEHOLDER_REGEX)) {
    found.add(match[1]);
  }
  return Array.from(found);
}

/**
 * Returns the unique list of placeholder names that are present in the template
 * but missing (absent, null, or undefined) in the provided variables map.
 */
export function findMissingPromptVariables(
  template: string,
  variables: RenderPromptVariables,
): string[] {
  const required = extractPromptVariables(template);
  return required.filter(
    (key) => !(key in variables) || variables[key] === null || variables[key] === undefined,
  );
}

export interface BuildRenderedPromptInput {
  systemPrompt: string;
  userPromptTemplate: string;
  variables: RenderPromptVariables;
}

export interface BuildRenderedPromptOutput {
  systemPrompt: string;
  userPrompt: string;
  missingVariables: string[];
}

/**
 * Renders both system and user prompts from a template and a variables map.
 * Also reports which placeholders were missing at render time.
 * systemPrompt is returned as-is since it typically has no placeholders.
 */
export function buildRenderedPrompt(
  input: BuildRenderedPromptInput,
): BuildRenderedPromptOutput {
  const { systemPrompt, userPromptTemplate, variables } = input;
  return {
    systemPrompt,
    userPrompt: renderPromptTemplate(userPromptTemplate, variables),
    missingVariables: findMissingPromptVariables(userPromptTemplate, variables),
  };
}
