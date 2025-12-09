"use client";

import { createContext, useContext, useMemo } from "react";
import { GenericStringStorage } from "../GenericStringStorage";

const InMemoryStorageContext = createContext<{ storage: GenericStringStorage } | undefined>(undefined);

export function InMemoryStorageProvider({ children }: { children: React.ReactNode }) {
  const storage = useMemo(() => new GenericStringStorage(), []);
  return (
    <InMemoryStorageContext.Provider value={{ storage }}>
      {children}
    </InMemoryStorageContext.Provider>
  );
}

export function useInMemoryStorage() {
  const ctx = useContext(InMemoryStorageContext);
  if (!ctx) throw new Error("useInMemoryStorage must be used within InMemoryStorageProvider");
  return ctx;
}
