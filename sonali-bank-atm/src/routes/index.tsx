import { createFileRoute } from "@tanstack/react-router";

import { BankApp } from "@/components/bank/BankApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sonali Bank — Core Banking & Digital ATM" },
      {
        name: "description",
        content:
          "Manage saved cards, withdraw, deposit, transfer with OTP and view statements in the Sonali Bank digital ATM terminal.",
      },
      { property: "og:title", content: "Sonali Bank — Core Banking & Digital ATM" },
      {
        property: "og:description",
        content: "A minimal, responsive digital ATM terminal for Sonali Bank cards.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BankApp,
});
