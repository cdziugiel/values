"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AppShellTopbarBadgeTone = "neutral" | "accent" | "danger";

export type AppShellTopbarBadge = {
  label: string;
  tone?: AppShellTopbarBadgeTone;
};

export type AppShellTopbarContextValue = {
  eyebrow?: string;
  title?: string;
  badges?: AppShellTopbarBadge[];
} | null;

type AppShellTopbarContextState = {
  topbarContext: AppShellTopbarContextValue;
  setTopbarContext: (value: AppShellTopbarContextValue) => void;
};

const AppShellTopbarContext =
  createContext<AppShellTopbarContextState | null>(null);

export function AppShellTopbarProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [topbarContext, setTopbarContext] =
    useState<AppShellTopbarContextValue>(null);

  const value = useMemo(
    () => ({
      topbarContext,
      setTopbarContext,
    }),
    [topbarContext],
  );

  return (
    <AppShellTopbarContext.Provider value={value}>
      {children}
    </AppShellTopbarContext.Provider>
  );
}

export function useAppShellTopbar() {
  const context = useContext(AppShellTopbarContext);

  if (!context) {
    throw new Error(
      "useAppShellTopbar must be used inside AppShellTopbarProvider",
    );
  }

  return context;
}

export function AppShellTopbarSetter({
  value,
}: {
  value: AppShellTopbarContextValue;
}) {
  const { setTopbarContext } = useAppShellTopbar();

  useEffect(() => {
    setTopbarContext(value);

    return () => {
      setTopbarContext(null);
    };
  }, [setTopbarContext, value]);

  return null;
}