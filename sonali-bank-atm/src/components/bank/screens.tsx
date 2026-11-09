import { useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  KeyRound,
  LogOut,
  MessageSquareText,
  ReceiptText,
  Send,
  Wallet,
  CalendarRange,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AMOUNT_MAX,
  CARD_NO_MAX,
  DAILY_DEPOSIT_LIMIT,
  DAILY_WITHDRAW_LIMIT,
  NAME_MAX,
  PIN_INPUT_MAX,
  TARGET_NO_MAX,
  type Card,
  type MonthlySummary,
  type NewCardInput,
  type Txn,
} from "@/lib/bank";
import {
  ActionTile,
  Actions,
  DebitCard,
  Field,
  LimitBar,
  Panel,
  Row,
  ScreenTitle,
  Stat,
  formatBDT,
} from "./ui";

const BDT = ({ n }: { n: number }) => <>BDT {formatBDT(n)}</>;

// 1. Dashboard
export function DashboardScreen(p: {
  onViewCards: () => void;
  onAddCard: () => void;
  onLaunchAtm: () => void;
  onExit: () => void;
}) {
  return (
    <Panel>
      <ScreenTitle
        eyebrow="Welcome"
        title="Sonali Bank"
        subtitle="Core Banking & Digital ATM Terminal"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <ActionTile
          icon={<Wallet />}
          label="View Saved Cards"
          description="Balances & daily overview"
          onClick={p.onViewCards}
        />
        <ActionTile
          icon={<CreditCard />}
          label="Add New Card"
          description="Debit / Credit registration"
          onClick={p.onAddCard}
        />
        <ActionTile
          icon={<ShieldCheck />}
          label="Launch ATM Session"
          description="Insert card & enter PIN"
          onClick={p.onLaunchAtm}
        />
        <ActionTile
          icon={<LogOut />}
          label="Exit System"
          description="Save data & close"
          onClick={p.onExit}
          tone="danger"
        />
      </div>
    </Panel>
  );
}

// 2. Saved cards
export function SavedCardsScreen({ cards, onBack }: { cards: Card[]; onBack: () => void }) {
  return (
    <Panel>
      <ScreenTitle
        eyebrow="Overview"
        title="Saved Cards"
        subtitle={`${cards.length} registered card${cards.length === 1 ? "" : "s"}`}
      />
      <div className="grid gap-5 md:grid-cols-2">
        {cards.map((c, i) => (
          <div key={i} className="space-y-4 rounded-3xl border bg-muted p-3 pb-5">
            <DebitCard card={c} />
            <div className="space-y-3 px-2">
              <LimitBar label="Today withdrawn" used={c.todayWithdrawn} limit={DAILY_WITHDRAW_LIMIT} />
              <LimitBar label="Today deposited" used={c.todayDeposited} limit={DAILY_DEPOSIT_LIMIT} />
            </div>
          </div>
        ))}
      </div>
      <Actions>
        <Button size="xl" variant="outline" onClick={onBack}>
          Back to Dashboard
        </Button>
      </Actions>
    </Panel>
  );
}

// 3. Add card
export function AddCardScreen({
  onSubmit,
  onCancel,
}: {
  onSubmit: (v: NewCardInput) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState<NewCardInput>({ name: "", cardNumber: "", pin: "", balance: "" });
  const set = (k: keyof NewCardInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV((s) => ({ ...s, [k]: e.target.value }));
  return (
    <Panel>
      <ScreenTitle eyebrow="Registration" title="New Card" subtitle="Register a debit or credit card." />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(v);
        }}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            className="sm:col-span-2"
            id="name"
            label="Card Holder Full Name"
            value={v.name}
            onChange={set("name")}
            maxLength={NAME_MAX}
          />
          <Field
            className="sm:col-span-2"
            id="card"
            label="Card Number"
            placeholder="e.g. 1812-8115-5200"
            value={v.cardNumber}
            onChange={set("cardNumber")}
            maxLength={CARD_NO_MAX}
          />
          <Field
            id="pin"
            label="Set 4-Digit Security PIN"
            type="password"
            inputMode="numeric"
            value={v.pin}
            onChange={set("pin")}
            maxLength={PIN_INPUT_MAX}
          />
          <Field
            id="bal"
            label="Initial Deposit Balance (BDT)"
            inputMode="decimal"
            value={v.balance}
            onChange={set("balance")}
            maxLength={AMOUNT_MAX}
          />
        </div>
        <Actions>
          <Button type="submit" size="xl">
            Save Card
          </Button>
          <Button type="button" size="xl" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </Actions>
      </form>
    </Panel>
  );
}

// 4. Select card
export function SelectCardScreen({
  cards,
  onProceed,
  onReturn,
}: {
  cards: Card[];
  onProceed: (index: number) => void;
  onReturn: () => void;
}) {
  const [sel, setSel] = useState(0);
  return (
    <Panel>
      <ScreenTitle
        eyebrow="ATM"
        title="Insert ATM Card"
        subtitle="Select registered card to proceed to terminal session."
      />
      <div role="radiogroup" className="space-y-2">
        {cards.map((c, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={sel === i}
            onClick={() => setSel(i)}
            className={cn(
              "flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              sel === i ? "border-primary bg-accent" : "bg-card hover:bg-muted",
            )}
          >
            <span
              className={cn(
                "grid size-5 shrink-0 place-items-center rounded-full border-2",
                sel === i ? "border-primary" : "border-input",
              )}
            >
              {sel === i && <span className="size-2.5 rounded-full bg-primary" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{c.holderName}</span>
              <span className="block font-mono text-sm tracking-wider text-muted-foreground">
                {c.cardNumber}
              </span>
            </span>
            <span className="hidden text-xs font-medium text-muted-foreground sm:block">
              Card #{i + 1}
            </span>
          </button>
        ))}
      </div>
      <Actions>
        <Button size="xl" onClick={() => onProceed(sel)}>
          Proceed to PIN Entry
        </Button>
        <Button size="xl" variant="outline" onClick={onReturn}>
          Return
        </Button>
      </Actions>
    </Panel>
  );
}

function useSubmit<T extends string[]>(handler: (...v: T) => void | Promise<unknown>) {
  return (e: FormEvent, ...v: T) => {
    e.preventDefault();
    void handler(...v);
  };
}

function SessionLine({ card }: { card: Card }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2">
      <span className="font-medium text-foreground">{card.holderName}</span>
      <span className="text-input">•</span>
      <span className="font-mono">{card.cardNumber}</span>
    </span>
  );
}

// 5. PIN
export function PinScreen({
  card,
  onSubmit,
  onEject,
}: {
  card: Card;
  onSubmit: (pin: string) => Promise<boolean>;
  onEject: () => void;
}) {
  const [pin, setPin] = useState("");
  return (
    <Panel className="mx-auto max-w-lg">
      <div className="mb-6 grid size-12 place-items-center rounded-2xl bg-accent text-accent-foreground">
        <KeyRound className="size-6" />
      </div>
      <ScreenTitle eyebrow="Security" title="Enter your PIN" subtitle={<SessionLine card={card} />} />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (await onSubmit(pin)) setPin("");
        }}
      >
        <Field
          id="pin"
          label="4-Digit Security PIN"
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          maxLength={PIN_INPUT_MAX}
          className="[&_input]:text-center [&_input]:font-mono [&_input]:text-2xl [&_input]:tracking-[0.6em]"
        />
        <Actions>
          <Button type="submit" size="xl">
            Verify & Unlock
          </Button>
          <Button type="button" size="xl" variant="outline" onClick={onEject}>
            Eject Card
          </Button>
        </Actions>
      </form>
    </Panel>
  );
}

// 6. ATM menu
export function AtmMenuScreen(p: {
  card: Card;
  onWithdraw: () => void;
  onBalance: () => void;
  onStatement: () => void;
  onTransfer: () => void;
  onDeposit: () => void;
  onSummary: () => void;
  onChangePin: () => void;
  onEject: () => void;
}) {
  return (
    <Panel>
      <ScreenTitle
        eyebrow="ATM Terminal"
        title={`Hello, ${p.card.holderName.split(" ")[0] || p.card.holderName}`}
        subtitle={<SessionLine card={p.card} />}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <ActionTile icon={<ArrowUpRight />} label="Cash Withdrawal" onClick={p.onWithdraw} />
        <ActionTile icon={<ArrowDownLeft />} label="Deposit Cash" onClick={p.onDeposit} />
        <ActionTile icon={<Wallet />} label="Balance Enquiry" onClick={p.onBalance} />
        <ActionTile icon={<CalendarRange />} label="Monthly Summary" onClick={p.onSummary} />
        <ActionTile icon={<ReceiptText />} label="Mini Statement" onClick={p.onStatement} />
        <ActionTile icon={<KeyRound />} label="Change PIN" onClick={p.onChangePin} />
        <ActionTile icon={<Send />} label="Fund Transfer" description="Card to card" onClick={p.onTransfer} />
        <ActionTile icon={<LogOut />} label="Eject Card & Return" onClick={p.onEject} tone="danger" />
      </div>
    </Panel>
  );
}

// 7 & 8. Withdraw / deposit
export function AmountScreen({
  kind,
  card,
  onSubmit,
  onBack,
}: {
  kind: "withdraw" | "deposit";
  card: Card;
  onSubmit: (amount: string) => void | Promise<void>;
  onBack: () => void;
}) {
  const [amount, setAmount] = useState("");
  const isW = kind === "withdraw";
  const limit = isW ? DAILY_WITHDRAW_LIMIT : DAILY_DEPOSIT_LIMIT;
  const used = isW ? card.todayWithdrawn : card.todayDeposited;
  const submit = useSubmit(onSubmit);
  return (
    <Panel>
      <ScreenTitle
        eyebrow={isW ? "Withdraw" : "Deposit"}
        title={isW ? "Cash Withdrawal" : "Cash Deposit"}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Daily limit" value={<BDT n={limit} />} />
        <Stat label={isW ? "Today withdrawn" : "Today deposited"} value={<BDT n={used} />} />
        <Stat label="Remaining today" value={<BDT n={limit - used} />} tone="primary" />
      </div>
      <form className="mt-8" onSubmit={(e) => submit(e, amount)}>
        <Field
          id="amount"
          label={isW ? "Enter Amount (Multiple of 500 BDT)" : "Enter Deposit Amount (BDT)"}
          inputMode="decimal"
          autoFocus
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          maxLength={AMOUNT_MAX}
          className="sm:max-w-sm [&_input]:font-mono"
        />
        <Actions>
          <Button type="submit" size="xl">
            {isW ? "Confirm Withdrawal" : "Deposit Cash"}
          </Button>
          <Button type="button" size="xl" variant="outline" onClick={onBack}>
            Back to Menu
          </Button>
        </Actions>
      </form>
    </Panel>
  );
}

// 9. Balance
export function BalanceScreen({ card, onBack }: { card: Card; onBack: () => void }) {
  return (
    <Panel>
      <ScreenTitle eyebrow="Enquiry" title="Account Balance" />
      <div className="grid items-center gap-6 md:grid-cols-[1.1fr_1fr]">
        <DebitCard card={card} />
        <div className="divide-y">
          <Row label="Card holder" value={<span className="font-sans">{card.holderName}</span>} />
          <Row label="Card number" value={card.cardNumber} />
          <Row label="Available balance" value={<BDT n={card.balance} />} strong />
          <div className="space-y-4 pt-4">
            <LimitBar label="Today's withdraw" used={card.todayWithdrawn} limit={DAILY_WITHDRAW_LIMIT} />
            <LimitBar label="Today's deposit" used={card.todayDeposited} limit={DAILY_DEPOSIT_LIMIT} />
          </div>
        </div>
      </div>
      <Actions>
        <Button size="xl" variant="outline" onClick={onBack}>
          Back to Menu
        </Button>
      </Actions>
    </Panel>
  );
}

const pad2 = (n: number) => String(n).padStart(2, "0");

function describeType(type: string): { label: string; out: boolean | null } {
  if (type.startsWith("TRNS_TO_")) return { label: `Transfer to ${type.slice(8)}`, out: true };
  if (type.startsWith("TRNS_FROM_")) return { label: `Received from ${type.slice(10)}`, out: false };
  if (type === "WITHDRAW") return { label: "Cash withdrawal", out: true };
  if (type === "DEPOSIT") return { label: "Cash deposit", out: false };
  return { label: type, out: null };
}

// 10. Mini statement
export function StatementScreen({
  card,
  txns,
  hasAnyHistory,
  onBack,
}: {
  card: Card;
  txns: Txn[];
  hasAnyHistory: boolean;
  onBack: () => void;
}) {
  return (
    <Panel>
      <ScreenTitle eyebrow="Mini Statement" title="Recent Transactions" />
      {txns.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-muted px-6 py-12 text-center text-sm text-muted-foreground">
          {hasAnyHistory
            ? "No activity records found for this card."
            : "No transaction history recorded on terminal."}
        </div>
      ) : (
        <ul className="max-h-[26rem] divide-y overflow-y-auto rounded-2xl border">
          {txns.map((t, i) => {
            const d = describeType(t.type);
            return (
              <li key={i} className="flex items-center gap-3 px-4 py-3 sm:gap-4">
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-xl [&_svg]:size-4",
                    d.out ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success",
                  )}
                >
                  {d.out ? <ArrowUpRight /> : <ArrowDownLeft />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{d.label}</span>
                  <span className="block font-mono text-xs text-muted-foreground">
                    {pad2(t.day)}/{pad2(t.month)}/{t.year} · {pad2(t.hour)}:{pad2(t.minute)}
                  </span>
                </span>
                <span className="text-right">
                  <span
                    className={cn(
                      "block font-mono text-sm font-semibold tabular",
                      d.out ? "text-destructive" : "text-success",
                    )}
                  >
                    {d.out ? "−" : "+"}
                    {formatBDT(t.amount)}
                  </span>
                  <span className="block font-mono text-xs text-muted-foreground tabular">
                    Bal {formatBDT(t.balance)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-5 flex items-center justify-between rounded-2xl bg-accent px-4 py-3">
        <span className="text-sm font-medium text-accent-foreground">Current available balance</span>
        <span className="font-mono font-bold tabular">
          <BDT n={card.balance} />
        </span>
      </div>
      <Actions>
        <Button size="xl" variant="outline" onClick={onBack}>
          Back to Menu
        </Button>
      </Actions>
    </Panel>
  );
}

// 11. Monthly summary
export function SummaryScreen({ summary, onBack }: { summary: MonthlySummary; onBack: () => void }) {
  return (
    <Panel>
      <ScreenTitle
        eyebrow="Monthly Summary"
        title={`${pad2(summary.month)} / ${summary.year}`}
        subtitle={`Total transactions logged: ${summary.count}`}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Total outflow (withdraw / transfers)" value={<BDT n={summary.outflow} />} tone="danger" />
        <Stat label="Total inflow (deposits / received)" value={<BDT n={summary.inflow} />} tone="success" />
        <Stat
          label="Net cash flow position"
          value={<BDT n={summary.net} />}
          tone={summary.net < 0 ? "danger" : "primary"}
        />
      </div>
      <Actions>
        <Button size="xl" variant="outline" onClick={onBack}>
          Back to Menu
        </Button>
      </Actions>
    </Panel>
  );
}

// 12. Change PIN
export function ChangePinScreen({
  onSubmit,
  onCancel,
}: {
  onSubmit: (pin: string) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [pin, setPin] = useState("");
  const submit = useSubmit(onSubmit);
  return (
    <Panel className="mx-auto max-w-lg">
      <ScreenTitle eyebrow="Security" title="Change PIN" />
      <form onSubmit={(e) => submit(e, pin)}>
        <Field
          id="newpin"
          label="Enter New 4-Digit PIN"
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          maxLength={PIN_INPUT_MAX}
          className="[&_input]:text-center [&_input]:font-mono [&_input]:text-2xl [&_input]:tracking-[0.6em]"
        />
        <Actions>
          <Button type="submit" size="xl">
            Update PIN
          </Button>
          <Button type="button" size="xl" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </Actions>
      </form>
    </Panel>
  );
}

// 13. Transfer
export function TransferScreen({
  card,
  onSubmit,
  onCancel,
}: {
  card: Card;
  onSubmit: (target: string, amount: string) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [target, setTarget] = useState("");
  const [amount, setAmount] = useState("");
  const submit = useSubmit(onSubmit);
  return (
    <Panel>
      <ScreenTitle
        eyebrow="Transfer"
        title="Card to Card Transfer"
        subtitle={
          <>
            Remaining daily limit:{" "}
            <span className="font-mono font-semibold text-primary">
              <BDT n={DAILY_WITHDRAW_LIMIT - card.todayWithdrawn} />
            </span>
          </>
        }
      />
      <form onSubmit={(e) => submit(e, target, amount)}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id="target"
            label="Recipient Card Number"
            autoFocus
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            maxLength={TARGET_NO_MAX}
            className="[&_input]:font-mono"
          />
          <Field
            id="tamount"
            label="Transfer Amount (BDT)"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            maxLength={AMOUNT_MAX}
            className="[&_input]:font-mono"
          />
        </div>
        <Actions>
          <Button type="submit" size="xl">
            Send OTP & Transfer
          </Button>
          <Button type="button" size="xl" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </Actions>
      </form>
    </Panel>
  );
}

// 14. OTP
export function OtpScreen({
  amount,
  otp,
  onSubmit,
  onCancel,
}: {
  amount: number;
  otp: number;
  onSubmit: (code: string) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [code, setCode] = useState("");
  const submit = useSubmit(onSubmit);
  return (
    <Panel className="mx-auto max-w-lg">
      <ScreenTitle eyebrow="Verification" title="OTP Verification" />
      <div className="flex gap-3 rounded-2xl border bg-muted p-4 animate-in fade-in slide-in-from-top-2">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          <MessageSquareText className="size-5" />
        </span>
        <div className="min-w-0 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            SMS notification simulation
          </p>
          <p className="mt-1">
            Fund transfer amount: <span className="font-mono font-semibold"><BDT n={amount} /></span>
          </p>
          <p>
            Your 4-digit OTP code:{" "}
            <span className="font-mono text-base font-bold tracking-[0.3em] text-primary">{otp}</span>
          </p>
        </div>
      </div>
      <form className="mt-6" onSubmit={(e) => submit(e, code)}>
        <Field
          id="otp"
          label="Enter the 4-Digit OTP to authorize"
          type="password"
          inputMode="numeric"
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={PIN_INPUT_MAX}
          className="[&_input]:text-center [&_input]:font-mono [&_input]:text-2xl [&_input]:tracking-[0.6em]"
        />
        <Actions>
          <Button type="submit" size="xl">
            Authorize Transfer
          </Button>
          <Button type="button" size="xl" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </Actions>
      </form>
    </Panel>
  );
}

export function ExitedScreen({ onRestart }: { onRestart: () => void }) {
  return (
    <Panel className="mx-auto max-w-lg text-center">
      <div className="mx-auto mb-6 grid size-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
        <LogOut className="size-6" />
      </div>
      <h1 className="text-2xl font-extrabold tracking-tight">System closed</h1>
      <p className="mt-2 text-muted-foreground">All data has been saved. Thank you for banking with Sonali Bank.</p>
      <div className="mt-8">
        <Button size="xl" onClick={onRestart}>
          Start again
        </Button>
      </div>
    </Panel>
  );
}

export function ReceiptView(p: {
  holder: string;
  cardNumber: string;
  type: string;
  amount: number;
  balance: number;
}) {
  const rows: [string, ReactNode][] = [
    ["Terminal ID", "ATM-0098"],
    ["Holder Name", p.holder],
    ["Card Number", p.cardNumber],
    ["Txn Type", p.type],
    ["Amount", `BDT ${p.amount.toFixed(2)}`],
    ["Avail Bal", `BDT ${p.balance.toFixed(2)}`],
  ];
  return (
    <div className="rounded-xl border border-dashed bg-muted p-4 font-mono text-xs text-foreground">
      <p className="text-center font-bold tracking-widest">SONALI BANK RECEIPT</p>
      <div className="my-3 border-t border-dashed" />
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3 py-0.5">
          <span className="text-muted-foreground">{k}</span>
          <span className="truncate text-right font-semibold">{v}</span>
        </div>
      ))}
      <div className="my-3 border-t border-dashed" />
      <p className="text-center text-muted-foreground">Thank you for banking with Sonali Bank!</p>
    </div>
  );
}
