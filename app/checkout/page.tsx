import type { Metadata } from "next";
import { Navbar, Footer } from "@/components/layout";
import { CheckoutClient } from "./CheckoutClient";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <Navbar />
      <main className="container-screen flex-1 py-4 sm:py-6">
        <CheckoutClient />
      </main>
      <Footer />
    </div>
  );
}
