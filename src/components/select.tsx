export function Select({ name, label, options, id = name }: { name: string; label: string; id?: string; options: readonly (string | { id: string; name: string })[] }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <select id={id} name={name} className="field">
        {options.map((o) => {
          const { id, name: text } = typeof o === "string" ? { id: o, name: o } : o;
          return <option key={id} value={id}>{text}</option>;
        })}
      </select>
    </div>
  );
}
