import { describe, expect, it } from "vitest";
import {
  addCard,
  changePin,
  completeTransfer,
  deposit,
  isPinCorrect,
  monthlySummary,
  prepareTransfer,
  resetDailyLimitsIfNeeded,
  seedState,
  withdraw,
} from "./bank";

const now = new Date(2026, 10, 8, 10, 30);

describe("withdraw", () => {
  it("only accepts multiples of 500", () => {
    const r = withdraw(seedState(now), 0, "750", now);
    expect(r.ok).toBe(false);
  });

  it("deducts balance for a valid amount", () => {
    const r = withdraw(seedState(now), 0, "1000", now);
    expect(r.ok && r.state.cards[0]!.balance).toBe(49000);
  });

  it("blocks more than 50000 per day", () => {
    const s = seedState(now);
    s.cards[0]!.balance = 100000;
    s.cards[0]!.todayWithdrawn = 49500;
    expect(withdraw(s, 0, "1000", now).ok).toBe(false);
  });

  it("blocks more than the balance", () => {
    expect(withdraw(seedState(now), 1, "25500", now).ok).toBe(false);
  });
});

describe("deposit", () => {
  it("blocks more than 100000 per day", () => {
    expect(deposit(seedState(now), 0, "100001", now).ok).toBe(false);
  });

  it("adds a valid deposit", () => {
    const r = deposit(seedState(now), 1, "5000", now);
    expect(r.ok && r.state.cards[1]!.balance).toBe(30000);
  });
});

describe("daily limits", () => {
  it("reset on a new day", () => {
    const s = seedState(now);
    s.cards[0]!.todayWithdrawn = 20000;
    const next = resetDailyLimitsIfNeeded(s, 0, new Date(2026, 10, 9));
    expect(next.cards[0]!.todayWithdrawn).toBe(0);
  });
});

describe("cards and PIN", () => {
  it("rejects a PIN that is not 4 characters", () => {
    const r = addCard(seedState(now), { name: "A", cardNumber: "1", pin: "123", balance: "0" }, now);
    expect(r.ok).toBe(false);
  });

  it("allows at most 10 cards", () => {
    let s = seedState(now);
    for (let i = 0; i < 8; i++) {
      const r = addCard(s, { name: "X", cardNumber: `9${i}`, pin: "1111", balance: "0" }, now);
      s = r.state;
    }
    expect(addCard(s, { name: "Y", cardNumber: "77", pin: "1111", balance: "0" }, now).ok).toBe(false);
  });

  it("checks the seeded PIN", () => {
    expect(isPinCorrect(seedState(now).cards[0]!, "2006")).toBe(true);
  });

  it("changes PIN only with 4 characters", () => {
    expect(changePin(seedState(now), 0, "12345").ok).toBe(false);
  });
});

describe("transfer", () => {
  it("cannot send to own card", () => {
    expect(prepareTransfer(seedState(now), 0, "1812811552", "100", now).ok).toBe(false);
  });

  it("moves money after the right OTP", () => {
    const p = prepareTransfer(seedState(now), 0, "100200300", "1500", now);
    if (!p.ok) throw new Error("prepare failed");
    const r = completeTransfer(p.state, 0, p.targetIndex, p.amount, 4321, "4321", now);
    expect(r.ok && [r.state.cards[0]!.balance, r.state.cards[1]!.balance]).toEqual([48500, 26500]);
  });

  it("is cancelled by a wrong OTP", () => {
    const r = completeTransfer(seedState(now), 0, 1, 100, 4321, "1111", now);
    expect(r.ok).toBe(false);
  });
});

describe("monthly summary", () => {
  it("adds withdrawals to outflow", () => {
    const r = withdraw(seedState(now), 0, "2000", now);
    expect(monthlySummary(r.state, "1812811552", now).outflow).toBe(2000);
  });
});
