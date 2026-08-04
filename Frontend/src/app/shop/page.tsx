"use client";

import { ShoppingBag } from "lucide-react";
import { PageShell } from "../../components/dune/Shell";

// Shop placeholder — empty for now; real content lands here later.
export default function ShopPage() {
  return (
    <PageShell className="shop-page">
      <main className="page-main placeholder-page">
        <div className="placeholder-card">
          <span className="placeholder-icon">
            <ShoppingBag size={34} />
          </span>
          <h1>Shop</h1>
          <p>Coming soon.</p>
        </div>
      </main>
    </PageShell>
  );
}
