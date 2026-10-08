import { notFound, redirect } from "next/navigation";
import Shell from "@/components/Shell";
import { requireSession } from "@/lib/auth";
import { ROLE_LABEL, PORTALS, homePath, isPortalId, isReadOnly, navFor, portalsFor } from "@/lib/rbac";
import { usingApi } from "@/lib/data";

export default async function PortalLayout({ children, params }: { children: React.ReactNode; params: Promise<{ portal: string }> }) {
  const { portal } = await params;
  if (!isPortalId(portal)) notFound();
  const session = await requireSession();
  const role = session.user.role;
  const nav = navFor(role, portal);
  if (nav.length === 0) redirect(homePath(role) + "?denied=1");

  const initials = session.user.name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  const switchTo = portalsFor(role).filter((p) => p !== portal).map((p) => ({ portal: p, label: PORTALS[p].title, href: `/${p}` }));
  const shortName = portal === "customer" ? session.user.name.replace(/^(\S+)\s(\S).*/, "$1 $2.") : session.user.name;

  return (
    <Shell
      portal={portal}
      title={PORTALS[portal].title}
      subtitle={PORTALS[portal].subtitle}
      nav={nav}
      user={{ name: shortName, roleLabel: ROLE_LABEL[role], initials }}
      switchTo={switchTo}
      readOnly={isReadOnly(role)}
      tenantLabel={portal === "merchant" ? "ABC Store" : undefined}
      dataSource={usingApi ? "Live data from the FacePay API." : "Demo data from built-in fixtures (NEXT_PUBLIC_API_URL not set)."}
    >
      {children}
    </Shell>
  );
}
