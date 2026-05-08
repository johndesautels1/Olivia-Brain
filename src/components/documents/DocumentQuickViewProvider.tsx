"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { DocumentQuickView } from "./DocumentQuickView";

interface QuickViewState {
  isOpen: boolean;
  documentId: string | null;
}

interface QuickViewContextValue {
  openQuickView: (documentId: string) => void;
  closeQuickView: () => void;
}

const QuickViewContext = createContext<QuickViewContextValue>({
  openQuickView: () => {},
  closeQuickView: () => {},
});

export function useDocumentQuickView() {
  return useContext(QuickViewContext);
}

export function DocumentQuickViewProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<QuickViewState>({ isOpen: false, documentId: null });

  const openQuickView = useCallback((documentId: string) => {
    setState({ isOpen: true, documentId });
  }, []);

  const closeQuickView = useCallback(() => {
    setState({ isOpen: false, documentId: null });
  }, []);

  return (
    <QuickViewContext.Provider value={{ openQuickView, closeQuickView }}>
      {children}
      {state.isOpen && state.documentId && (
        <DocumentQuickView documentId={state.documentId} onClose={closeQuickView} />
      )}
    </QuickViewContext.Provider>
  );
}
