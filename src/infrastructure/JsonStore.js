import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const seedPath = path.join(projectRoot, "data", "store.seed.json");

export class JsonStore {
  constructor(filePath = process.env.DATA_FILE || path.join(projectRoot, "data", "store.json")) {
    this.filePath = filePath;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    if (!fs.existsSync(filePath)) fs.copyFileSync(seedPath, filePath);
  }

  read() {
    try {
      return JSON.parse(fs.readFileSync(this.filePath, "utf8"));
    } catch (error) {
      throw new Error(`No fue posible leer el almacenamiento local: ${error.message}`);
    }
  }

  write(state) {
    const temporaryPath = `${this.filePath}.tmp`;
    fs.writeFileSync(temporaryPath, JSON.stringify(state, null, 2), "utf8");
    fs.renameSync(temporaryPath, this.filePath);
  }

  update(mutator) {
    const state = this.read();
    const result = mutator(state);
    this.write(state);
    return result;
  }
}
