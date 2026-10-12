interface ActorSelectProps {
  actors: string[];
  value: string;
  onChange: (actor: string) => void;
}

/** Stands in for a login: whoever is selected here is recorded as the actor of a status change. */
export function ActorSelect({ actors, value, onChange }: ActorSelectProps) {
  return (
    <label className="actor-select">
      <span>Acting as</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={actors.length === 0}
      >
        {actors.map((actor) => (
          <option key={actor} value={actor}>
            {actor}
          </option>
        ))}
      </select>
    </label>
  );
}
