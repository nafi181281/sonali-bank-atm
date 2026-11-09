import { useEffect, useRef, useState } from "react";
import { Landmark } from "lucide-react";

import {
  MAX_PIN_ATTEMPTS,
  addCard,
  changePin,
  completeTransfer,
  deposit,
  generateOtp,
  historyForCard,
  isPinCorrect,
  loadState,
  monthlySummary,
  prepareTransfer,
  resetAllDailyLimits,
  resetDailyLimitsIfNeeded,
  saveState,
  withdraw,
  type BankState,
  type NewCardInput,
  type Notice,
} from "@/lib/bank";
import { DialogProvider, useDialog } from "./dialog";
import {
  AddCardScreen,
  AmountScreen,
  AtmMenuScreen,
  BalanceScreen,
  ChangePinScreen,
  DashboardScreen,
  ExitedScreen,
  OtpScreen,
  PinScreen,
  ReceiptView,
  SavedCardsScreen,
  SelectCardScreen,
  StatementScreen,
  SummaryScreen,
  TransferScreen,
} from "./screens";

type Screen =
  | "dashboard"
  | "saved"
  | "add"
  | "select"
  | "pin"
  | "atm"
  | "withdraw"
  | "deposit"
  | "balance"
  | "statement"
  | "summary"
  | "changepin"
  | "transfer"
  | "otp"
  | "exited";

/** Beep(850, 250); Beep(1200, 350); */
function playOtpBeep() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const tone = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.value = 0.05;
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    };
    tone(850, 0, 0.25);
    tone(1200, 0.25, 0.35);
    setTimeout(() => void ctx.close(), 900);
  } catch {
    // audio not available
  }
}

export function BankApp() {
  return (
    <DialogProvider>
      <Terminal />
    </DialogProvider>
  );
}

function Terminal() {
  const dialog = useDialog();
  const [bank, setBank] = useState<BankState | null>(null);
  const bankRef = useRef<BankState | null>(null);
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [current, setCurrent] = useState(-1);
  const pinAttempts = useRef(0);
  const pending = useRef({ amount: 0, target: -1, otp: 0 });
  const [otpView, setOtpView] = useState({ amount: 0, otp: 0 });

  useEffect(() => {
    const s = loadState(window.localStorage, new Date());
    bankRef.current = s;
    setBank(s);
  }, []);

  const commit = (s: BankState) => {
    if (s === bankRef.current) return;
    bankRef.current = s;
    setBank(s);
    saveState(window.localStorage, s);
  };

  const show = (n: Notice) => dialog.alert(n);

  const go = (next: Screen, idx = current) => {
    const s = bankRef.current;
    if (s) {
      const now = new Date();
      if (next === "saved") commit(resetAllDailyLimits(s, now));
      if (next === "withdraw" || next === "deposit" || next === "balance" || next === "transfer") {
        commit(resetDailyLimitsIfNeeded(s, idx, now));
      }
    }
    setScreen(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const promptReceipt = async (type: string, amount: number, s: BankState) => {
    const yes = await dialog.confirm({
      title: "Receipt",
      message: "Transaction complete. Would you like a printed receipt?",
      tone: "question",
    });
    if (yes) {
      const c = s.cards[current];
      if (!c) return;
      await dialog.alert({
        title: "ATM Receipt",
        tone: "info",
        message: (
          <ReceiptView
            holder={c.holderName}
            cardNumber={c.cardNumber}
            type={type}
            amount={amount}
            balance={c.balance}
          />
        ),
      });
    }
  };

  if (!bank) {
    return (
      <Shell>
        <div className="h-80 animate-pulse rounded-3xl border bg-card" />
      </Shell>
    );
  }

  const card = current >= 0 ? bank.cards[current] : undefined;
  const sessionScreens: Screen[] = ["atm", "withdraw", "deposit", "balance", "statement", "summary", "changepin", "transfer", "otp"];
  const inSession = !!card && sessionScreens.includes(screen);

  const launchAtm = () => {
    if (bank.cards.length === 0) {
      void show({ title: "Warning", message: "No registered cards found. Add a card first.", tone: "warning" });
    } else {
      go("select");
    }
  };

  const toAtm = () => go("atm");

  let content: React.ReactNode = null;
  switch (screen) {
    case "dashboard":
      content = (
        <DashboardScreen
          onViewCards={() => go("saved")}
          onAddCard={() => go("add")}
          onLaunchAtm={launchAtm}
          onExit={() => {
            saveState(window.localStorage, bank);
            go("exited");
          }}
        />
      );
      break;
    case "saved":
      content = <SavedCardsScreen cards={bank.cards} onBack={() => go("dashboard")} />;
      break;
    case "add":
      content = (
        <AddCardScreen
          onCancel={() => go("dashboard")}
          onSubmit={async (v: NewCardInput) => {
            const r = addCard(bank, v, new Date());
            if (!r.ok) return show(r.error);
            commit(r.state);
            await show({ title: "Success", message: "Card Registered Successfully!", tone: "success" });
            go("dashboard");
          }}
        />
      );
      break;
    case "select":
      content = (
        <SelectCardScreen
          cards={bank.cards}
          onReturn={() => go("dashboard")}
          onProceed={(i) => {
            if (i < 0 || i >= bank.cards.length) return;
            setCurrent(i);
            pinAttempts.current = 0;
            commit(resetDailyLimitsIfNeeded(bank, i, new Date()));
            go("pin", i);
          }}
        />
      );
      break;
    case "pin":
      content = card && (
        <PinScreen
          card={card}
          onEject={launchAtm}
          onSubmit={async (pin) => {
            if (isPinCorrect(card, pin)) {
              go("atm");
              return false;
            }
            pinAttempts.current++;
            if (pinAttempts.current >= MAX_PIN_ATTEMPTS) {
              await show({
                title: "Security Lockdown",
                message: "Card Blocked: 3 Consecutive Incorrect PIN Attempts!",
                tone: "error",
              });
              go("dashboard");
              return false;
            }
            await show({
              title: "Unauthorized Access",
              message: `Incorrect PIN entered! (${MAX_PIN_ATTEMPTS - pinAttempts.current} of 3 attempts remaining)`,
              tone: "warning",
            });
            return true;
          }}
        />
      );
      break;
    case "atm":
      content = card && (
        <AtmMenuScreen
          card={card}
          onWithdraw={() => go("withdraw")}
          onDeposit={() => go("deposit")}
          onBalance={() => go("balance")}
          onStatement={() => go("statement")}
          onSummary={() => go("summary")}
          onChangePin={() => go("changepin")}
          onTransfer={() => go("transfer")}
          onEject={async () => {
            saveState(window.localStorage, bank);
            await show({
              title: "Session Terminated",
              message: "Card safely ejected. Thank you for using Sonali Bank ATM!",
              tone: "info",
            });
            go("dashboard");
          }}
        />
      );
      break;
    case "withdraw":
    case "deposit": {
      const isW = screen === "withdraw";
      content = card && (
        <AmountScreen
          key={screen}
          kind={screen}
          card={card}
          onBack={toAtm}
          onSubmit={async (amount) => {
            const r = (isW ? withdraw : deposit)(bankRef.current!, current, amount, new Date());
            commit(r.state);
            if (!r.ok) return void (await show(r.error));
            await show(
              isW
                ? { title: "Dispense Success", message: "Cash Dispensed. Please collect your notes.", tone: "success" }
                : { title: "Deposit Complete", message: "Cash credited to balance successfully.", tone: "success" },
            );
            await promptReceipt(isW ? "WITHDRAW" : "DEPOSIT", r.amount, r.state);
            go("atm");
          }}
        />
      );
      break;
    }
    case "balance":
      content = card && <BalanceScreen card={card} onBack={toAtm} />;
      break;
    case "statement":
      content = card && (
        <StatementScreen
          card={card}
          txns={historyForCard(bank, card.cardNumber)}
          hasAnyHistory={bank.history.length > 0}
          onBack={toAtm}
        />
      );
      break;
    case "summary":
      content = card && (
        <SummaryScreen summary={monthlySummary(bank, card.cardNumber, new Date())} onBack={toAtm} />
      );
      break;
    case "changepin":
      content = (
        <ChangePinScreen
          onCancel={toAtm}
          onSubmit={async (pin) => {
            const r = changePin(bankRef.current!, current, pin);
            if (!r.ok) return void (await show(r.error));
            commit(r.state);
            await show({ title: "Success", message: "Security PIN updated successfully!", tone: "success" });
            go("atm");
          }}
        />
      );
      break;
    case "transfer":
      content = card && (
        <TransferScreen
          card={card}
          onCancel={toAtm}
          onSubmit={async (target, amount) => {
            const r = prepareTransfer(bankRef.current!, current, target, amount, new Date());
            commit(r.state);
            if (!r.ok) return void (await show(r.error));
            const otp = generateOtp();
            pending.current = { amount: r.amount, target: r.targetIndex, otp };
            setOtpView({ amount: r.amount, otp });
            playOtpBeep();
            go("otp");
          }}
        />
      );
      break;
    case "otp":
      content = (
        <OtpScreen
          amount={otpView.amount}
          otp={otpView.otp}
          onCancel={toAtm}
          onSubmit={async (code) => {
            const p = pending.current;
            const r = completeTransfer(bankRef.current!, current, p.target, p.amount, p.otp, code, new Date());
            if (!r.ok) {
              await show(r.error);
              go("atm");
              return;
            }
            commit(r.state);
            await show({
              title: "Transfer Complete",
              message: `Transfer Authorized! Dispatched BDT ${p.amount.toFixed(2)} to ${r.state.cards[p.target]?.holderName ?? ""}.`,
              tone: "success",
            });
            await promptReceipt("TRANSFER", p.amount, r.state);
            go("atm");
          }}
        />
      );
      break;
    case "exited":
      content = <ExitedScreen onRestart={() => go("dashboard")} />;
      break;
  }

  return (
    <Shell
      session={inSession && card ? `${card.holderName} · ${card.cardNumber}` : undefined}
    >
      {content}
    </Shell>
  );
}

function Shell({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: string | undefined;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Landmark className="size-5" />
            </span>
            <span className="text-left leading-tight">
              <span className="block text-[15px] font-extrabold tracking-tight">Sonali Bank</span>
              <span className="block text-[11px] font-medium text-muted-foreground">
                Core Banking System
              </span>
            </span>
          </div>
          {session ? (
            <span className="hidden min-w-0 items-center gap-2 rounded-full sm:flex border bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground">
              <span className="size-2 shrink-0 animate-pulse rounded-full bg-success" />
              <span className="truncate">{session}</span>
            </span>
          ) : (
            <span className="hidden rounded-full border px-3 py-1.5 font-mono text-xs text-muted-foreground sm:block">
              ATM-0098
            </span>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-12">{children}</main>
      <footer className="py-6 text-center text-xs text-muted-foreground">
        © Sonali Bank · Digital ATM Terminal
      </footer>
    </div>
  );
}
