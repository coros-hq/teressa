// A small JSON Schema (draft-07) checker: just the keywords the registry-item schema uses, so we
// don't need a new dependency. Returns a list of problems, empty when the value is valid.
// Not a general validator: unknown keywords are ignored.

type Schema = {
  type?: string | string[];
  enum?: unknown[];
  const?: unknown;
  properties?: Record<string, Schema | boolean>;
  required?: string[];
  items?: Schema;
  additionalProperties?: Schema | boolean;
  if?: Schema;
  then?: Schema;
  else?: Schema;
  allOf?: Schema[];
  oneOf?: Schema[];
  not?: Schema;
  $ref?: string;
  definitions?: Record<string, Schema>;
};

const typeOf = (v: unknown) => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v === "number" && Number.isInteger(v) ? "integer" : typeof v);

export function validateAgainstSchema(value: unknown, schema: Schema, root: Schema = schema, path = "$"): string[] {
  const errors: string[] = [];
  const valid = (v: unknown, s: Schema) => validateAgainstSchema(v, s, root, path).length === 0;

  if (schema.$ref) {
    const target = root.definitions?.[schema.$ref.replace("#/definitions/", "")];
    return target ? validateAgainstSchema(value, target, root, path) : [`${path}: unresolved ${schema.$ref}`];
  }
  if (schema.type) {
    const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actual = typeOf(value);
    if (!allowed.some((t) => t === actual || (t === "number" && actual === "integer"))) {
      return [`${path}: expected ${allowed.join(" or ")}, got ${actual}`];
    }
  }
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path}: must be one of ${schema.enum.join(", ")}`);
  if ("const" in schema && value !== schema.const) errors.push(`${path}: must equal ${JSON.stringify(schema.const)}`);

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    for (const key of schema.required ?? []) if (!(key in obj)) errors.push(`${path}: missing required "${key}"`);
    for (const [key, sub] of Object.entries(schema.properties ?? {})) {
      if (!(key in obj)) continue;
      if (sub === false) errors.push(`${path}.${key}: not allowed here`);
      else if (sub !== true) errors.push(...validateAgainstSchema(obj[key], sub, root, `${path}.${key}`));
    }
    if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
      for (const [key, v] of Object.entries(obj))
        if (!(key in (schema.properties ?? {}))) errors.push(...validateAgainstSchema(v, schema.additionalProperties, root, `${path}.${key}`));
    }
  }
  if (Array.isArray(value) && schema.items) {
    value.forEach((v, i) => errors.push(...validateAgainstSchema(v, schema.items!, root, `${path}[${i}]`)));
  }
  for (const s of schema.allOf ?? []) errors.push(...validateAgainstSchema(value, s, root, path));
  if (schema.oneOf && schema.oneOf.filter((s) => valid(value, s)).length !== 1) errors.push(`${path}: must match exactly one option`);
  if (schema.not && valid(value, schema.not)) errors.push(`${path}: matches a disallowed shape`);
  if (schema.if) {
    const branch = valid(value, schema.if) ? schema.then : schema.else;
    if (branch) errors.push(...validateAgainstSchema(value, branch, root, path));
  }
  return errors;
}
