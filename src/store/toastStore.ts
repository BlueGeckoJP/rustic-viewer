import { create } from "zustand";

export type ToastItem = {
  message: string;
  isError: boolean;
  dateId: number;
};

export type ToastStoreState = {
  errorToasts: ToastItem[];
  addToast: (message: string, isError: boolean) => void;
  removeToast: (id: number) => void;
};

const useToastStore = create<ToastStoreState>((set) => ({
  errorToasts: [] as ToastItem[],

  addToast: (message: string, isError: boolean) => {
    const now = Date.now();

    set((state) => ({
      errorToasts: [{ message, isError, dateId: now }, ...state.errorToasts],
    }));
  },

  removeToast: (id: number) => {
    set((state) => ({
      errorToasts: state.errorToasts.filter((toast) => toast.dateId !== id),
    }));
  },
}));

const originalConsoleError = console.error;

console.error = (...args: unknown[]) => {
  useToastStore.getState().addToast(String(args[0]), true);
  originalConsoleError(...args);
};

export default useToastStore;
