import { notFound } from "next/navigation";
import { requireAccess } from "@/lib/auth";
import { isPortalId } from "@/lib/rbac";
import { customerPages } from "@/pages-impl/customer";
import { merchantPages } from "@/pages-impl/merchant";
import { adminPages } from "@/pages-impl/admin";
import { superPages } from "@/pages-impl/super";
import type { Session } from "@/lib/session";
import type { PortalId } from "@/lib/types";

type PageFn = (s: Session) => Promise<React.ReactNode> | React.ReactNode;
const REGISTRY: Record<PortalId, Record<string, PageFn>> = {
  customer: customerPages,
  merchant: merchantPages,
  admin: adminPages,
  super: superPages,
};

export const dynamic = "force-dynamic";

export default async function PortalPage({ params, searchParams }: { params: Promise<{ portal: string; slug?: string[] }>; searchParams: Promise<{ denied?: string }> }) {
  const { portal, slug = [] } = await params;
  const { denied } = await searchParams;
  if (!isPortalId(portal) || slug.length > 1) notFound();
  const key = slug[0] ?? "";
  const session = await requireAccess(`/${portal}${key ? "/" + key : ""}`);
  const render = REGISTRY[portal][key];
  if (!render) notFound();
  return (<>{denied && <div role="alert" className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">Your role does not have access to that page. You have been returned to your home screen.</div>}{await render(session)}</>);
}
