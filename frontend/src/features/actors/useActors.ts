import { useEffect, useState } from "react";
import { getErrorMessage } from "../../core/http";
import { actorApi } from "./actor.api";

/** Loads the predefined user list and tracks which of them the viewer is acting as. */
export function useActors() {
  const [actors, setActors] = useState<string[]>([]);
  const [actor, setActor] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    actorApi
      .list()
      .then((list) => {
        setActors(list);
        setActor((current) => current || (list[0] ?? ""));
      })
      .catch((err: unknown) => setError(getErrorMessage(err)));
  }, []);

  return { actors, actor, setActor, error };
}
