import {
  faExclamationTriangle,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
import useErrorToastStore from "../store/errorToastStore";

const ErrorToast = () => {
  const errorToasts = useErrorToastStore((s) => s.errorToasts);
  const removeErrorToast = useErrorToastStore((s) => s.removeErrorToast);
  const [expandedToasts, setExpandedToasts] = useState<Set<number>>(new Set());

  const toastOnClick = (id: number) => {
    const newSet = new Set(expandedToasts);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setExpandedToasts(newSet);
  };

  return (
    <div className="fixed top-2 right-2 z-50 max-w-md max-h-[calc(100vh-0.5rem)] overflow-y-auto overflow-x-hidden rounded-xl bg-[#482325] shadow-xl">
      <div className="flex flex-col divide-y divide-[#6b3a3d]/60">
        {errorToasts.map((toast) => {
          const isExpanded = expandedToasts.has(toast[1]);

          return (
            <div
              key={toast[1]}
              className="m-2 not-last-of-type:mb-0 rounded-lg border border-[#6b3a3d]/60 bg-[#4b2729]/80 px-3 py-2 text-[#F1C9C8] text-sm shadow-sm transition-all duration-200 ease-out hover:shadow-md"
            >
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faExclamationTriangle} />
                <button
                  className="min-w-0 flex-1 truncate text-left hover:opacity-80 cursor-pointer"
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => toastOnClick(toast[1])}
                >
                  {toast[0]}
                </button>
                <button
                  className="rounded-md px-2 py-1 text-[#f5d9d8]/80 hover:bg-[#6b3a3d]/50 hover:text-[#f5d9d8] cursor-pointer"
                  type="button"
                  onClick={() => removeErrorToast(toast[1])}
                  aria-label="Dismiss error"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>

              <div
                className={`ml-6.5 mt-1 overflow-hidden whitespace-pre-wrap break-all text-[#f5d9d8] transition-[max-height,opacity] duration-200 ease-out ${
                  isExpanded ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                {toast[0]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ErrorToast;
