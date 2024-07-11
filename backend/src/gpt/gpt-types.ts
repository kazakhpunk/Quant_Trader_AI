export type Trade = {
  symbol: string;
  action: string;
  quantity: number;
  price: number;
  reason?: string;
};
