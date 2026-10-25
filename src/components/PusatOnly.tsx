"use client";
import { useAuthData } from "@/hooks/useAuthData";
import type { ReactNode } from "react";

/** Destructive record actions are not delegable to other roles. */
export default function PusatOnly({ children }: { children: ReactNode }) {
  const { role, authLoading } = useAuthData();
  return !authLoading && role === "pusat" ? <>{children}</> : null;
}
