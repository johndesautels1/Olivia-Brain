"use client";

import { createContext, useContext } from "react";
import type { OrgLink } from "@/lib/autolinker";

const OrgMapContext = createContext<OrgLink[]>([]);

export function OrgMapProvider({
  orgMap,
  children,
}: {
  orgMap: OrgLink[];
  children: React.ReactNode;
}) {
  return <OrgMapContext.Provider value={orgMap}>{children}</OrgMapContext.Provider>;
}

export function useOrgMap(): OrgLink[] {
  return useContext(OrgMapContext);
}
