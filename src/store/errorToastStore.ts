import { create } from "zustand";

export type ErrorToastStoreState = {
  errorToasts: [string, number][];
  addErrorToast: (message: string) => void;
  removeErrorToast: (id: number) => void;
};

const useErrorToastStore = create<ErrorToastStoreState>((set) => ({
  errorToasts: [] as [string, number][],

  addErrorToast: (message: string) => {
    const now = Date.now();

    set((state) => ({
      errorToasts: [[message, now], ...state.errorToasts],
    }));

    setTimeout(() => {
      set((state) => ({
        errorToasts: state.errorToasts.filter(
          ([, timestamp]) => timestamp !== now,
        ),
      }));
    }, 8000);
  },

  removeErrorToast: (id: number) => {
    set((state) => ({
      errorToasts: state.errorToasts.filter(
        ([, timestamp]) => timestamp !== id,
      ),
    }));
  },
}));

const originalConsoleError = console.error;

console.error = (...args: unknown[]) => {
  useErrorToastStore.getState().addErrorToast(String(args[0]));
  originalConsoleError(...args);
};

export default useErrorToastStore;
