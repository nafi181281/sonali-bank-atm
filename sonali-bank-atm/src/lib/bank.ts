/**
 * Sonali Bank core logic — a 1:1 port of the original C program.
 * Every rule, limit, message and quirk is kept exactly as in the C source;
 * only the storage (files -> localStorage) and the screen layer differ.
 */

export const MAX_CARDS = 10;
export const DAILY_WITHDRAW_LIMIT = 50000.0;
export const DAILY_DEPOSIT_LIMIT = 100000.0;

// Same buffer sizes as the C edit controls (GetDlgItemText keeps size - 1 chars).
export const NAME_MAX = 29;
export const CARD_NO_MAX = 19;
export const PIN_INPUT_MAX = 9;
export const TARGET_NO_MAX = 24;
export const AMOUNT_MAX = 29;

export interface Card {
  cardNumber: string;
  holderName: string;
  balance: number;
  pin: number;
  isActive: boolean;
  todayWithdrawn: number;
  todayDeposited: number;
  lastTxnDay: number;
  lastTxnMonth: number;
  lastTxnYear: number;
}

/** One line of the old atm_history.txt file. */
export interface Txn {
  cardNumber: string;
  day: number;
  month: number;
  year: number;
  hour: number;
  minute: number;
  type: string;
  amount: number;
  balance: number;
}

export interface BankState {
  cards: Card[];
  history: Txn[];
}

export type Tone = "info" | "success" | "warning" | "error";

export interface Notice {
  title: string;
  message: string;
  tone: Tone;
}

export type Outcome<T = object> =
  | ({ ok: true; state: BankState } & T)
  | { ok: false; state: BankState; error: Notice };

// ---------- C helpers ----------

/** C atof(): leading number, 0 when nothing parses. */
export function atof(s: string): number {
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}

/** C atoi(): leading integer, 0 when nothing parses. */
export function atoi(s: string): number {
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? 0 : n;
}

function dateParts(now: Date) {
  return {
    day: now.getDate(),
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    hour: now.getHours(),
    minute: now.getMinutes(),
  };
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Exact text of a history line, as written by fprintf in the C code. */
export function formatHistoryLine(t: Txn): string {
  return (
    `${t.cardNumber} | ${pad2(t.day)}/${pad2(t.month)}/${String(t.year).padStart(4, "0")} | ` +
    `${pad2(t.hour)}:${pad2(t.minute)} | ${t.type.padEnd(10)} | BDT ${t.amount.toFixed(2).padEnd(8)} | ` +
    `Bal: BDT ${t.balance.toFixed(2)}`
  );
}

function cardAt(state: BankState, index: number): Card {
  const c = state.cards[index];
  if (!c) throw new Error(`No card at index ${index}`);
  return c;
}

function updateCard(state: BankState, index: number, patch: Partial<Card>): BankState {
  return {
    ...state,
    cards: state.cards.map((c, i) => (i === index ? { ...c, ...patch } : c)),
  };
}

function makeTxn(cardNumber: string, type: string, amount: number, balance: number, now: Date): Txn {
  const d = dateParts(now);
  return { cardNumber, ...d, type, amount, balance };
}

const fail = (state: BankState, title: string, message: string, tone: Tone = "error") => ({
  ok: false as const,
  state,
  error: { title, message, tone },
});

// ---------- Seed data (loadAllData when no file exists) ----------

export function seedState(now: Date): BankState {
  const d = dateParts(now);
  const base = {
    isActive: true,
    todayWithdrawn: 0,
    todayDeposited: 0,
    lastTxnDay: d.day,
    lastTxnMonth: d.month,
    lastTxnYear: d.year,
  };
  return {
    cards: [
      { ...base, cardNumber: "1812811552", holderName: "Nafi Ul Sheak", balance: 50000.0, pin: 2006 },
      { ...base, cardNumber: "100200300", holderName: "Mehedi Hassan", balance: 25000.0, pin: 1122 },
    ],
    history: [],
  };
}

// ---------- Daily limits ----------

/** Returns the same object when nothing changed. */
export function resetDailyLimitsIfNeeded(state: BankState, index: number, now: Date): BankState {
  if (index < 0 || index >= state.cards.length) return state;
  const d = dateParts(now);
  const c = cardAt(state, index);
  if (c.lastTxnDay !== d.day || c.lastTxnMonth !== d.month || c.lastTxnYear !== d.year) {
    return updateCard(state, index, {
      todayWithdrawn: 0,
      todayDeposited: 0,
      lastTxnDay: d.day,
      lastTxnMonth: d.month,
      lastTxnYear: d.year,
    });
  }
  return state;
}

export function resetAllDailyLimits(state: BankState, now: Date): BankState {
  let next = state;
  for (let i = 0; i < state.cards.length; i++) next = resetDailyLimitsIfNeeded(next, i, now);
  return next;
}

// ---------- Add card ----------

export interface NewCardInput {
  name: string;
  cardNumber: string;
  pin: string;
  balance: string;
}

export function addCard(state: BankState, input: NewCardInput, now: Date): Outcome {
  if (state.cards.length >= MAX_CARDS) {
    return fail(state, "Error", "Card limit reached (Max 10)!");
  }
  const name = input.name.slice(0, NAME_MAX);
  const cardNo = input.cardNumber.slice(0, CARD_NO_MAX);
  const pinStr = input.pin.slice(0, PIN_INPUT_MAX);
  const balStr = input.balance.slice(0, AMOUNT_MAX);

  if (name.length === 0 || cardNo.length === 0 || pinStr.length !== 4) {
    return fail(state, "Validation Error", "Please fill all fields. PIN must be 4 digits.", "warning");
  }
  const d = dateParts(now);
  const card: Card = {
    holderName: name,
    cardNumber: cardNo,
    pin: atoi(pinStr),
    balance: atof(balStr),
    isActive: true,
    todayWithdrawn: 0,
    todayDeposited: 0,
    lastTxnDay: d.day,
    lastTxnMonth: d.month,
    lastTxnYear: d.year,
  };
  return { ok: true, state: { ...state, cards: [...state.cards, card] } };
}

// ---------- PIN ----------

export const MAX_PIN_ATTEMPTS = 3;

export function isPinCorrect(card: Card, pinInput: string): boolean {
  return atoi(pinInput.slice(0, PIN_INPUT_MAX)) === card.pin;
}

export function changePin(state: BankState, index: number, pinInput: string): Outcome {
  const pinStr = pinInput.slice(0, PIN_INPUT_MAX);
  if (pinStr.length !== 4) {
    return fail(state, "Error", "Invalid PIN format. Exactly 4 numeric digits required.");
  }
  return { ok: true, state: updateCard(state, index, { pin: atoi(pinStr) }) };
}

// ---------- Withdraw ----------

export function withdraw(
  state: BankState,
  index: number,
  amountInput: string,
  now: Date,
): Outcome<{ amount: number }> {
  const s = resetDailyLimitsIfNeeded(state, index, now);
  const card = cardAt(s, index);
  const amount = atof(amountInput.slice(0, AMOUNT_MAX));
  const remaining = DAILY_WITHDRAW_LIMIT - card.todayWithdrawn;

  if (Math.trunc(amount) % 500 !== 0 || amount <= 0) {
    return fail(s, "Input Error", "Amount must be a positive multiple of 500 BDT.");
  }
  if (amount > remaining) {
    return fail(s, "Limit Exceeded", "Exceeds daily withdrawal limit ceiling!");
  }
  if (amount > card.balance) {
    return fail(s, "Balance Error", "Insufficient account balance!");
  }
  const balance = card.balance - amount;
  const next = updateCard(s, index, { balance, todayWithdrawn: card.todayWithdrawn + amount });
  return {
    ok: true,
    amount,
    state: {
      ...next,
      history: [...next.history, makeTxn(card.cardNumber, "WITHDRAW", amount, balance, now)],
    },
  };
}

// ---------- Deposit ----------

export function deposit(
  state: BankState,
  index: number,
  amountInput: string,
  now: Date,
): Outcome<{ amount: number }> {
  const s = resetDailyLimitsIfNeeded(state, index, now);
  const card = cardAt(s, index);
  const amount = atof(amountInput.slice(0, AMOUNT_MAX));
  const remaining = DAILY_DEPOSIT_LIMIT - card.todayDeposited;

  if (amount <= 0) {
    return fail(s, "Input Error", "Enter a valid positive deposit amount.");
  }
  if (amount > remaining) {
    return fail(s, "Limit Exceeded", "Exceeds daily deposit ceiling limit!");
  }
  const balance = card.balance + amount;
  const next = updateCard(s, index, { balance, todayDeposited: card.todayDeposited + amount });
  return {
    ok: true,
    amount,
    state: {
      ...next,
      history: [...next.history, makeTxn(card.cardNumber, "DEPOSIT", amount, balance, now)],
    },
  };
}

// ---------- Transfer ----------

export function prepareTransfer(
  state: BankState,
  index: number,
  targetInput: string,
  amountInput: string,
  now: Date,
): Outcome<{ amount: number; targetIndex: number }> {
  const s = resetDailyLimitsIfNeeded(state, index, now);
  const card = cardAt(s, index);
  const target = targetInput.slice(0, TARGET_NO_MAX);
  const amount = atof(amountInput.slice(0, AMOUNT_MAX));

  if (target === card.cardNumber) {
    return fail(s, "Transfer Error", "Target recipient cannot be your own active card!");
  }
  const targetIndex = s.cards.findIndex((c) => c.cardNumber === target);
  if (targetIndex === -1) {
    return fail(s, "Error", "Recipient card number not found in system directory!");
  }
  const remaining = DAILY_WITHDRAW_LIMIT - card.todayWithdrawn;
  if (amount <= 0 || amount > remaining || amount > card.balance) {
    return fail(s, "Error", "Invalid amount or exceeds limit/available balance!");
  }
  return { ok: true, state: s, amount, targetIndex };
}

/** rand() % 9000 + 1000 */
export function generateOtp(random: () => number = Math.random): number {
  return Math.floor(random() * 9000) + 1000;
}

export function completeTransfer(
  state: BankState,
  index: number,
  targetIndex: number,
  amount: number,
  otp: number,
  otpInput: string,
  now: Date,
): Outcome {
  if (atoi(otpInput.slice(0, PIN_INPUT_MAX)) !== otp) {
    return fail(state, "Security Alert", "INCORRECT OTP! Transfer protocol revoked.");
  }
  const sender = cardAt(state, index);
  const receiver = cardAt(state, targetIndex);
  const senderBal = sender.balance - amount;
  const receiverBal = receiver.balance + amount;

  let next = updateCard(state, index, {
    balance: senderBal,
    todayWithdrawn: sender.todayWithdrawn + amount,
  });
  next = updateCard(next, targetIndex, { balance: receiverBal });
  next = {
    ...next,
    history: [
      ...next.history,
      makeTxn(sender.cardNumber, `TRNS_TO_${receiver.cardNumber}`, amount, senderBal, now),
      makeTxn(receiver.cardNumber, `TRNS_FROM_${sender.cardNumber}`, amount, receiverBal, now),
    ],
  };
  return { ok: true, state: next };
}

// ---------- Statements ----------

/** Same matching as strstr(line, card_number) in the C code. */
export function historyForCard(state: BankState, cardNumber: string): Txn[] {
  return state.history.filter((t) => formatHistoryLine(t).includes(cardNumber));
}

export interface MonthlySummary {
  month: number;
  year: number;
  count: number;
  outflow: number;
  inflow: number;
  net: number;
}

export function monthlySummary(state: BankState, cardNumber: string, now: Date): MonthlySummary {
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  let outflow = 0;
  let inflow = 0;
  let count = 0;

  for (const t of historyForCard(state, cardNumber)) {
    // sscanf("%s | ...") fails when a token contains whitespace.
    if (/\s/.test(t.cardNumber) || /\s/.test(t.type)) continue;
    if (t.month !== month || t.year !== year) continue;
    if (t.type.includes("WITHDRAW") || t.type.includes("TRNS_TO")) {
      outflow += t.amount;
      count++;
    } else if (t.type.includes("DEPOSIT") || t.type.includes("TRNS_FROM")) {
      inflow += t.amount;
      count++;
    }
  }
  return { month, year, count, outflow, inflow, net: inflow - outflow };
}

// ---------- Storage (replaces bank_cards.dat / atm_history.txt) ----------

const CARDS_KEY = "sonali_bank_cards";
const HISTORY_KEY = "sonali_atm_history";

export function loadState(storage: Storage, now: Date): BankState {
  const rawCards = storage.getItem(CARDS_KEY);
  if (rawCards === null) {
    const seeded = seedState(now);
    const rawHistory = storage.getItem(HISTORY_KEY);
    seeded.history = rawHistory ? (JSON.parse(rawHistory) as Txn[]) : [];
    saveState(storage, seeded);
    return seeded;
  }
  const rawHistory = storage.getItem(HISTORY_KEY);
  return {
    cards: JSON.parse(rawCards) as Card[],
    history: rawHistory ? (JSON.parse(rawHistory) as Txn[]) : [],
  };
}

export function saveState(storage: Storage, state: BankState) {
  storage.setItem(CARDS_KEY, JSON.stringify(state.cards));
  storage.setItem(HISTORY_KEY, JSON.stringify(state.history));
}
