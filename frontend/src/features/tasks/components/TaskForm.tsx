import { useState, type FormEvent } from "react";
import type { CreateTaskRequest } from "../task.types";

interface TaskFormProps {
  onCreate: (input: CreateTaskRequest) => Promise<boolean>;
}

export function TaskForm({ onCreate }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    const created = await onCreate({ title, description });
    setSubmitting(false);

    // Keep what was typed if the server rejected it.
    if (created) {
      setTitle("");
      setDescription("");
    }
  }

  return (
    <form className="card task-form" onSubmit={handleSubmit}>
      <h2>New task</h2>
      <label>
        <span>Title</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Prepare invoice"
          maxLength={200}
          required
        />
      </label>
      <label>
        <span>
          Description <em>(optional)</em>
        </span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
          maxLength={2000}
        />
      </label>
      <button type="submit" className="button button--primary" disabled={submitting}>
        Add task
      </button>
    </form>
  );
}
