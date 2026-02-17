import {
  faExclamationTriangle,
  faInfoCircle,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import useToastState from "../store/toastStore";

const ToastNotification = () => {
  const errorToasts = useToastState((s) => s.errorToasts);
  const removeErrorToast = useToastState((s) => s.removeToast);
  const [expandedToasts, setExpandedToasts] = useState<Set<number>>(new Set());

  const hasToasts = errorToasts.length > 0;

  const toastOnClick = (id: number) => {
    const newSet = new Set(expandedToasts);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setExpandedToasts(newSet);
  };

  return (
    <AnimatePresence>
      {hasToasts && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed top-2 right-2 z-50 max-w-md max-h-[calc(100vh-0.5rem)] overflow-y-auto overflow-x-hidden rounded-xl bg-[#37353E] shadow-xl"
        >
          <div className="flex flex-col divide-y divide-[#4C6178]/60">
            <AnimatePresence>
              {errorToasts.map((toast) => {
                const isExpanded = expandedToasts.has(toast.dateId);

                return (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    key={toast.dateId}
                    className={`m-2 not-last-of-type:mb-0 rounded-lg border px-3 py-2 text-sm shadow-sm transition-all duration-200 ease-out hover:shadow-md ${
                      toast.isError
                        ? "border-[#6b3a3d]/60 bg-[#4b2729]/80 text-[#F1C9C8]"
                        : "border-[#526983]/60 bg-[#3A4A5C]/80 text-[#D3DAD9]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon
                        icon={
                          toast.isError ? faExclamationTriangle : faInfoCircle
                        }
                      />
                      <button
                        className="min-w-0 flex-1 truncate text-left hover:opacity-80 cursor-pointer"
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={() => toastOnClick(toast.dateId)}
                      >
                        {toast.message}
                      </button>
                      <button
                        className={`rounded-md px-2 py-1 cursor-pointer ${
                          toast.isError
                            ? "text-[#f5d9d8]/80 hover:bg-[#6b3a3d]/50 hover:text-[#f5d9d8]"
                            : "text-[#D7E4F1]/80 hover:bg-[#526983]/50 hover:text-[#EAF3FC]"
                        }`}
                        type="button"
                        onClick={() => removeErrorToast(toast.dateId)}
                        aria-label="Dismiss error"
                      >
                        <FontAwesomeIcon icon={faXmark} />
                      </button>
                    </div>

                    <motion.div
                      initial={false}
                      animate={{
                        opacity: isExpanded ? 1 : 0,
                        height: isExpanded ? "auto" : 0,
                      }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className={`ml-6.5 mt-1 overflow-hidden whitespace-pre-wrap break-all ${
                        toast.isError ? "text-[#f5d9d8]" : "text-[#E1EAF3]"
                      }`}
                    >
                      {toast.message}
                    </motion.div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ToastNotification;
