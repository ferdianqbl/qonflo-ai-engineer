/**
 * There is no authentication in this app, so the "users" are a fixed list.
 * This is the one file to replace when actors come from a real users table.
 */
const ACTORS = ["john.doe", "jane.smith", "budi.santoso"];

export class ActorRepository {
  findAll(): string[] {
    return [...ACTORS];
  }

  exists(name: string): boolean {
    return ACTORS.includes(name);
  }
}
