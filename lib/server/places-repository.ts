import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { places as seedPlaces } from "@/lib/data/places";
import type { Place } from "@/lib/types";

const dataDirPath = path.join(process.cwd(), "data");
const dataFilePath = path.join(dataDirPath, "places.json");

let writeQueue = Promise.resolve();

const serialize = (places: Place[]): string => `${JSON.stringify(places, null, 2)}\n`;

const ensureStorage = async (): Promise<void> => {
  await mkdir(dataDirPath, { recursive: true });

  try {
    await readFile(dataFilePath, "utf8");
  } catch {
    await writeFile(dataFilePath, serialize(seedPlaces), "utf8");
  }
};

export const readPlaces = async (): Promise<Place[]> => {
  await ensureStorage();
  const content = await readFile(dataFilePath, "utf8");
  const parsed = JSON.parse(content) as Place[];
  return Array.isArray(parsed) ? parsed : [];
};

export const writePlaces = async (places: Place[]): Promise<void> => {
  await ensureStorage();

  writeQueue = writeQueue.then(async () => {
    await writeFile(dataFilePath, serialize(places), "utf8");
  });

  await writeQueue;
};
