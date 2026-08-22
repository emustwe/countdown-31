// Hand-maintained mirror of the Backend's public DTO/response shapes. We don't generate
// these from OpenAPI because our controllers validate with zod, not class-validator, so
// @nestjs/swagger has no decorators to introspect — the generated spec had no request/
// response bodies. Keep this in sync with Backend/src/modules/**/dto and **/*.mapper.ts.

export interface PublicUser {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: "PLAYER" | "ADMIN";
  status: "ACTIVE" | "BANNED";
  createdAt: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
}

export interface AuthTokens {
  accessToken: string;
}

export type RegisterResponse = { user: PublicUser } & AuthTokens;
export type LoginResponse = { user: PublicUser } & AuthTokens;
export type RefreshResponse = AuthTokens;
export type MeResponse = PublicUser & { balance: string };

export interface WalletSnapshot {
  balance: string;
  reconciled: boolean;
  currency: string;
  asset: string;
  network: string;
  /** Platform address players send USDT to when depositing. */
  depositAddress: string;
  /** true = real on-chain devnet flow (send from your wallet + verify); false = instant mock. */
  live: boolean;
}

export interface MoneyMovementResult {
  balance: string;
  amount: string;
  type: "DEPOSIT" | "WITHDRAWAL";
  transferId: string;
  txSignature: string;
  address: string;
}

export interface CryptoTransferDto {
  direction: "DEPOSIT" | "WITHDRAWAL";
  address: string;
  txSignature: string | null;
  status: "PENDING" | "COMPLETED" | "FAILED";
}

export interface LedgerEntryDto {
  id: string;
  amount: string;
  type:
    | "DEPOSIT"
    | "WITHDRAWAL"
    | "BET_STAKE"
    | "BET_WIN"
    | "JACKPOT_WIN"
    | "ADJUSTMENT"
    | "TOURNAMENT_ENTRY"
    | "TOURNAMENT_PRIZE"
    | "TOURNAMENT_REFUND";
  refType: string | null;
  refId: string | null;
  createdAt: string;
  transfer: CryptoTransferDto | null;
}

export interface TransactionPage {
  entries: LedgerEntryDto[];
  nextCursor: string | null;
}

export type SymbolId = "H1" | "H2" | "H3" | "L1" | "L2" | "L3" | "L4" | "W" | "S" | "JP";
export type Grid = SymbolId[][];

export interface PublicMathModel {
  id: string;
  version: string;
  displayName: string;
  grid: { reels: 5; rows: 5 };
  symbols: SymbolId[];
  wild: "W";
  scatter: "S";
  paytable: Record<string, number[]>;
  scatterPays: number[];
  freeSpins: {
    award: Record<3 | 4 | 5, number>;
    startMultiplier: number;
    multiplierStep: number;
    maxMultiplier: number;
    retrigger: boolean;
  };
  jackpot?: {
    symbol: "JP";
    pays: Record<3 | 4 | 5, number>;
  };
}

export interface JackpotWinDto {
  tier: 3 | 4 | 5;
  pay: string;
}

export interface WinLineDto {
  symbol: string;
  matchLength: number;
  ways: number;
  win: string;
}

export interface SpinApiResponse {
  roundId: string;
  newBalance: string;
  totalBet: string;
  totalWin: string;
  base: {
    grid: Grid;
    lines: WinLineDto[];
    scatterCount: number;
    win: string;
    jackpot?: JackpotWinDto;
  };
  feature?: {
    type: "FREE_SPINS";
    awarded: number;
    retriggers: number;
    featureWin: string;
    spins: Array<{
      grid: Grid;
      lines: WinLineDto[];
      scatterCount: number;
      win: string;
      multiplier: number;
      retriggered: boolean;
      jackpot?: JackpotWinDto;
    }>;
  };
  freeSpinsRemaining: number;
  state: "FEATURE" | "COMPLETE";
}

export interface FreeSpinRevealResponse {
  roundId: string;
  index: number;
  grid: Grid;
  result: {
    lines: WinLineDto[];
    scatterCount: number;
    multiplier: number;
    retriggered: boolean;
    jackpot?: JackpotWinDto;
  };
  win: string;
  freeSpinsRemaining: number;
  state: "FEATURE" | "COMPLETE";
}

export interface RoundDetail {
  id: string;
  modelId: string;
  modelVersion: string;
  totalBet: string;
  totalWin: string;
  state: "STAKED" | "RESOLVED" | "FEATURE" | "COMPLETE";
  freeSpinsRemaining: number;
  createdAt: string;
  completedAt: string | null;
  spins: Array<{ index: number; grid: Grid; result: unknown; win: string }>;
}

export interface RoundSummary {
  id: string;
  modelId: string;
  totalBet: string;
  totalWin: string;
  state: "STAKED" | "RESOLVED" | "FEATURE" | "COMPLETE";
  createdAt: string;
  completedAt: string | null;
}

export interface RoundsPage {
  rounds: RoundSummary[];
  nextCursor: string | null;
}

export interface AdminUser {
  id: string;
  email: string;
  role: "PLAYER" | "ADMIN";
  status: "ACTIVE" | "BANNED";
  createdAt: string;
  balance: string;
}

export interface AdminUsersPage {
  users: AdminUser[];
  nextCursor: string | null;
}

export interface AdminMathModel {
  id: string;
  version: string;
  displayName: string;
  targetRtp: number;
  active: boolean;
  computed: {
    theoreticalRtpBase?: number;
    empiricalRtpTotal?: number;
    hitFrequency?: number;
    volatilityIndex?: number;
    simSpins?: number;
  } | null;
}

export interface AdminTransaction {
  id: string;
  userEmail: string;
  amount: string;
  type: "DEPOSIT" | "WITHDRAWAL" | "BET_STAKE" | "BET_WIN" | "JACKPOT_WIN" | "ADJUSTMENT";
  refType: string | null;
  refId: string | null;
  createdAt: string;
}

export interface AdminTransactionsPage {
  entries: AdminTransaction[];
  nextCursor: string | null;
}

export interface AnalyticsTopWin {
  roundId: string;
  userEmail: string;
  modelId: string;
  totalBet: string;
  totalWin: string;
  createdAt: string;
}

export interface Analytics {
  windowDays: number;
  totalSpins: number;
  totalStaked: string;
  totalReturned: string;
  ggr: string;
  activeUsers: number;
  observedRtp: number;
  topWins: AnalyticsTopWin[];
}

export interface AuditLogEntry {
  id: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  dataJson: unknown;
  createdAt: string;
}

export interface AuditLogPage {
  entries: AuditLogEntry[];
  nextCursor: string | null;
}

export interface ApiErrorEnvelope {
  statusCode: number;
  error: string;
  message: string | { message?: string; issues?: Array<{ path: string; message: string }> };
  path: string;
  timestamp: string;
  requestId?: string;
}
