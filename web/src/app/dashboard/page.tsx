import { redirect } from "next/navigation";

// /dashboard was a secondary list/card/map view; deprecated in favor of
// /statistics as the single dashboard entry point. Any bookmark or cached
// URL hitting /dashboard is redirected.
export default function DashboardRedirect() {
  redirect("/statistics");
}
