"use client";

import TestingPage from "@/app/testing/page";
import { useParams } from "next/navigation";

export default function CompanyDetail() {
  const params = useParams<{ id: string }>();
  const company = decodeURIComponent(params.id);
  return <TestingPage focusCompany={company} />;
}
