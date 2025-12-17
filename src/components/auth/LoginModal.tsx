import { Loader2, Lock, Wallet } from "lucide-react";

import { clsx } from "clsx";
import { useAuthStore } from "@/store/auth-store";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import { useWalletStore } from "@/store/wallet-store";

export function LoginModal() {
  const { isAuthenticated } = useAuthStore();
  const { handleUnlock, status: authStatus, authError } = useBiometricAuth();
  const {
    connect,
    isConnected,
    isConnecting,
    error: walletError,
  } = useWalletStore();

  if (isAuthenticated) {
    return null;
  }

  const isLoading =
    isConnecting || (authStatus !== "idle" && authStatus !== "error");

  const displayError = authError || walletError;

  const handleClick = () => {
    if (!isConnected) {
      void connect();
    } else {
      void handleUnlock();
    }
  };

  let buttonText: string;
  if (isConnecting) {
    buttonText = "Connecting...";
  } else if (authStatus === "signing") {
    buttonText = "Awaiting Signature...";
  } else if (authStatus === "deriving") {
    buttonText = "Decrypting...";
  } else if (isConnected) {
    buttonText = "Sign to Unlock";
  } else {
    buttonText = "Connect Wallet";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md border-[3px] border-black bg-white p-8 shadow-[8px_8px_0px_0px_#000000] animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center border-[3px] border-black bg-[var(--color-primary)] text-white shadow-[4px_4px_0px_0px_#000000]">
            <Lock className="h-8 w-8" />
          </div>
        </div>

        <h2 className="mb-2 text-center text-2xl font-black uppercase tracking-tight">
          System Locked
        </h2>
        <p className="mb-8 text-center font-mono text-sm text-gray-600">
          Connect and sign with your wallet to decrypt local storage.
        </p>

        {displayError && (
          <div className="mb-6 border-[2px] border-black bg-[var(--color-danger)] p-3 text-center">
            <p className="font-mono text-xs font-bold text-white">
              {displayError}
            </p>
          </div>
        )}

        <button
          disabled={isLoading}
          type="button"
          className={clsx(
            "flex h-14 w-full items-center justify-center gap-3 border-[3px] border-black text-sm font-bold uppercase tracking-[0.15em] transition-all",
            isLoading
              ? "cursor-wait bg-gray-200 text-gray-500"
              : "bg-black text-white hover:bg-[var(--color-primary)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
          )}
          onClick={handleClick}
        >
          {isLoading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Wallet className="h-5 w-5" />
          )}
          {buttonText}
        </button>
      </div>
    </div>
  );
}
