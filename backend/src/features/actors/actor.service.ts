import { ValidationError } from "../../core/errors";
import type { ActorRepository } from "./actor.repository";

export class ActorService {
  private readonly repository: ActorRepository;

  constructor(repository: ActorRepository) {
    this.repository = repository;
  }

  listActors(): string[] {
    return this.repository.findAll();
  }

  /** Whoever is recorded as the actor of a change must be on the predefined list. */
  assertKnownActor(name: string): void {
    if (!this.repository.exists(name)) {
      const allowed = this.repository.findAll().join(", ");
      throw new ValidationError(`actor must be one of: ${allowed}`);
    }
  }
}
