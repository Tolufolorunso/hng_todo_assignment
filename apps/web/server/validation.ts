export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export type ValidationOutcome<T> =
  | { success: true; data: T }
  | { success: false; errors: ValidationErrorDetail[] };

export async function parseJsonBody<T = unknown>(request: Request): Promise<
  | { success: true; data: T }
  | { success: false; error: string }
> {
  try {
    const text = await request.text();
    if (!text || text.trim() === "") {
      return { success: false, error: "Request body cannot be empty" };
    }
    const data = JSON.parse(text) as T;
    return { success: true, data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid JSON";
    return { success: false, error: `Malformed JSON payload: ${msg}` };
  }
}

export function validateString(
  value: unknown,
  field: string,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
  } = {}
): string | null {
  if (value === undefined || value === null || value === "") {
    if (options.required) {
      return `${field} is required`;
    }
    return null;
  }

  if (typeof value !== "string") {
    return `${field} must be a string`;
  }

  if (options.minLength !== undefined && value.length < options.minLength) {
    return `${field} must be at least ${options.minLength} characters`;
  }

  if (options.maxLength !== undefined && value.length > options.maxLength) {
    return `${field} cannot exceed ${options.maxLength} characters`;
  }

  return null;
}

export function validateEmail(value: unknown, field = "email"): string | null {
  const strError = validateString(value, field, { required: true, maxLength: 255 });
  if (strError) return strError;

  const emailStr = String(value).trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailStr)) {
    return `${field} must be a valid email address`;
  }

  return null;
}

export function validateEnum<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
  required = true
): string | null {
  if (value === undefined || value === null) {
    return required ? `${field} is required` : null;
  }

  if (typeof value !== "string" || !allowed.includes(value as T)) {
    return `${field} must be one of: ${allowed.join(", ")}`;
  }

  return null;
}

export function validateInteger(
  value: unknown,
  field: string,
  options: {
    required?: boolean;
    min?: number;
    max?: number;
  } = {}
): string | null {
  if (value === undefined || value === null) {
    return options.required ? `${field} is required` : null;
  }

  if (typeof value !== "number" || !Number.isInteger(value)) {
    return `${field} must be an integer`;
  }

  if (options.min !== undefined && value < options.min) {
    return `${field} cannot be less than ${options.min}`;
  }

  if (options.max !== undefined && value > options.max) {
    return `${field} cannot exceed ${options.max}`;
  }

  return null;
}

export function validateDateFormat(value: unknown, field: string, required = false): string | null {
  if (value === undefined || value === null || value === "") {
    return required ? `${field} is required` : null;
  }

  if (typeof value !== "string") {
    return `${field} must be a string in YYYY-MM-DD format`;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${field} must be in YYYY-MM-DD format`;
  }

  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) {
    return `${field} is not a valid calendar date`;
  }

  return null;
}
