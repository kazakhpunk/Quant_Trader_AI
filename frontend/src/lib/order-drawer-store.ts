import { create } from "zustand";

interface OrderDrawerState {
  symbol: string | null;
  isOpen: boolean;
  open: (symbol: string) => void;
  close: () => void;
}

export const useOrderDrawer = create<OrderDrawerState>((set) => ({
  symbol: null,
  isOpen: false,
  open: (symbol) => set({ symbol, isOpen: true }),
  close: () => set({ isOpen: false }),
}));
