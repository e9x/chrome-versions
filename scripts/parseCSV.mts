import { createInterface } from "node:readline";

type csvRow = Record<string, string>;

export default async function* iterateCSVRows(body: NodeJS.ReadableStream) {
  const keys: string[] = [];

  let index = 0;

  for await (const line of createInterface(body)) {
    const i = index++;

    const values = line.split(",").filter((x) => x);

    if (i === 0) {
      keys.push(...values);
      continue;
    }

    if (values.length !== keys.length) throw new Error(`Bad row ${i}`);

    const object: csvRow = {};

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];

      object[key] = values[i];
    }

    yield object;
  }
}
