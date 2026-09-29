export const TITLE_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 2000;

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export interface TaskInput {
  title: string;
  description?: string;
}

export interface ValidTaskInput {
  title: string;
  description: string;
}

export interface TaskPatch {
  title?: string;
  description?: string;
  completed?: boolean;
}

export interface ValidTaskPatch {
  title?: string;
  description?: string;
  completed?: boolean;
}

function validateTitle(raw: string): ValidationResult<string> {
  const title = raw.trim();
  if (title.length === 0) {
    return { ok: false, error: "Title is required." };
  }
  if (title.length > TITLE_MAX_LENGTH) {
    return {
      ok: false,
      error: `Title must be ${TITLE_MAX_LENGTH} characters or fewer.`,
    };
  }
  return { ok: true, value: title };
}

function validateDescription(raw: string): ValidationResult<string> {
  const description = raw.trim();
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    return {
      ok: false,
      error: `Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer.`,
    };
  }
  return { ok: true, value: description };
}

export function validateTaskInput(input: TaskInput): ValidationResult<ValidTaskInput> {
  const title = validateTitle(input.title);
  if (!title.ok) {
    return title;
  }
  const description = validateDescription(input.description ?? "");
  if (!description.ok) {
    return description;
  }
  return { ok: true, value: { title: title.value, description: description.value } };
}

export function validateTaskPatch(patch: TaskPatch): ValidationResult<ValidTaskPatch> {
  const value: ValidTaskPatch = {};

  if (patch.title !== undefined) {
    const title = validateTitle(patch.title);
    if (!title.ok) {
      return title;
    }
    value.title = title.value;
  }

  if (patch.description !== undefined) {
    const description = validateDescription(patch.description);
    if (!description.ok) {
      return description;
    }
    value.description = description.value;
  }

  if (patch.completed !== undefined) {
    if (typeof patch.completed !== "boolean") {
      return { ok: false, error: "Completed must be a boolean." };
    }
    value.completed = patch.completed;
  }

  return { ok: true, value };
}

export const NOTE_TITLE_MAX_LENGTH = 200;
export const NOTE_BODY_MAX_LENGTH = 10000;

export interface NoteInput {
  title: string;
  body?: string;
}

export interface ValidNoteInput {
  title: string;
  body: string;
}

export interface NotePatch {
  title?: string;
  body?: string;
}

export interface ValidNotePatch {
  title?: string;
  body?: string;
}

function validateNoteTitle(raw: string): ValidationResult<string> {
  const title = raw.trim();
  if (title.length === 0) {
    return { ok: false, error: "Title is required." };
  }
  if (title.length > NOTE_TITLE_MAX_LENGTH) {
    return {
      ok: false,
      error: `Title must be ${NOTE_TITLE_MAX_LENGTH} characters or fewer.`,
    };
  }
  return { ok: true, value: title };
}

function validateNoteBody(raw: string): ValidationResult<string> {
  const body = raw.trim();
  if (body.length > NOTE_BODY_MAX_LENGTH) {
    return {
      ok: false,
      error: `Body must be ${NOTE_BODY_MAX_LENGTH} characters or fewer.`,
    };
  }
  return { ok: true, value: body };
}

export function validateNoteInput(input: NoteInput): ValidationResult<ValidNoteInput> {
  const title = validateNoteTitle(input.title);
  if (!title.ok) {
    return title;
  }
  const body = validateNoteBody(input.body ?? "");
  if (!body.ok) {
    return body;
  }
  return { ok: true, value: { title: title.value, body: body.value } };
}

export function validateNotePatch(patch: NotePatch): ValidationResult<ValidNotePatch> {
  const value: ValidNotePatch = {};

  if (patch.title !== undefined) {
    const title = validateNoteTitle(patch.title);
    if (!title.ok) {
      return title;
    }
    value.title = title.value;
  }

  if (patch.body !== undefined) {
    const body = validateNoteBody(patch.body);
    if (!body.ok) {
      return body;
    }
    value.body = body.value;
  }

  return { ok: true, value };
}
