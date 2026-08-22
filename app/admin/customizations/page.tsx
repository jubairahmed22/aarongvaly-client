import type { Metadata } from "next";
import { notFound } from "next/navigation";
// import { CustomizationsClient } from "./CustomizationsClient";

export const metadata: Metadata = { title: "Customizations" };

/**
 * Temporarily hidden - the page 404s and its sidebar link is commented out
 * (see app/admin/AdminSidebar.tsx). Nothing is deleted: to bring it back,
 * restore the import + `return <CustomizationsClient />;` and uncomment the
 * sidebar item.
 */
export default function CustomizationsPage() {
  notFound();
  // return <CustomizationsClient />;
}
