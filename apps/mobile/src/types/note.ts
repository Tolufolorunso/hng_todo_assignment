export interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteInput {
  title: string;
  body?: string;
}

export interface UpdateNoteInput {
  title?: string;
  body?: string;
}
