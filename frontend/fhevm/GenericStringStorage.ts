export class GenericStringStorage {
  #map = new Map<string, string>();

  async setItem(key: string, value: string): Promise<void> {
    this.#map.set(key, value);
  }

  async getItem(key: string): Promise<string | undefined> {
    return this.#map.get(key);
  }
}
