export type Przelewy24TestAccessResponse = {
  data?: boolean;
  error?: string | null;
  responseCode?: number;
};

export type Przelewy24RegisterTransactionInput = {
  sessionId: string;
  amount: number;
  currency: string;
  description: string;
  email: string;
  client?: string;
  country?: string;
  language?: "pl" | "en";
  urlReturn: string;
  urlStatus: string;
};

export type Przelewy24RegisterTransactionResponse = {
  data?: {
    token?: string;
  };
  responseCode?: number;
  error?: string;
};

export type Przelewy24VerifyTransactionInput = {
  sessionId: string;
  amount: number;
  currency: string;
  orderId: number;
};

export type Przelewy24VerifyTransactionResponse = {
  data?: {
    status?: string;
  };
  responseCode?: number;
  error?: string;
};

export type Przelewy24Notification = {
  merchantId: number;
  posId: number;
  sessionId: string;
  amount: number;
  originAmount: number;
  currency: string;
  orderId: number;
  methodId: number;
  statement: string;
  sign: string;
};