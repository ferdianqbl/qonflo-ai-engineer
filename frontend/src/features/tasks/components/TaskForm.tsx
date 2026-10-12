import { useState, type FormEvent } from "react";
import type { TaskInput } from "../task.types";

interface TaskFormProps {
  /** Values to start from when editing. Leave out for an empty form. */
  initial?: TaskInput;
  submitLabel: string;
  disabled?: boolean;
  onSubmit: (input: TaskInput) => Promise<boolean>;
  /** Shows a Cancel button when given. */
  onCancel?: () => void;
}

/** Title and description fields, used both to create a task and to edit one. */
export function TaskForm({ initial, submitLabel, disabled, onSubmit, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    const saved = await onSubmit({ title, description });
    setSubmitting(false);

    // Keep what was typed if the server rejected it. An edit form is closed by its parent.
    if (saved && !initial) {
      setTitle("");
      setDescription("");
    }
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
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
      <div className="task-form__actions">
        <button type="submit" className="button button--primary" disabled={disabled || submitting}>
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
