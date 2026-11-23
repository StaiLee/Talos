import type { Metadata } from "next";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Talos · Paritel", template: "%s · Talos" },
  description: "Centre de pilotage des appels d’offres Paritel",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr">
    <body>
      <Sidebar />
      <main className="min-h-screen lg:pl-[238px]">{children}</main>
    </body>
  </html>;
}
