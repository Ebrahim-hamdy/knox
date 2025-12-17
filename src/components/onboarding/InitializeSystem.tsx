import { Wallet, WalletCards } from "lucide-react";

import { KnoxCard } from "@/components/ui/knox-card";
import { KnoxLoader } from "@/components/ui/knox-loader";
import { clsx } from "clsx";
import { useAuthStore } from "@/store/auth-store";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useWalletStore } from "@/store/wallet-store";

export function InitializeSystem() {
  const navigate = useNavigate();
  const { handleUnlock, status: authStatus, authError } = useBiometricAuth();
  const { isAuthenticated } = useAuthStore.getState();

  const {
    connect,
    isConnected,
    isConnecting,
    error: walletError,
    walletPkh,
  } = useWalletStore();

  useEffect(() => {
    if (isAuthenticated) {
      void navigate({ to: "/dashboard", search: { view: "create" } });
    }
  }, [isAuthenticated, navigate]);

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      console.error("Wallet connection failed:", error);
    }
  };

  const handleSignAndInitialize = async () => {
    await handleUnlock();
  };

  const displayError = authError || walletError;
  const isWorking = isConnecting || authStatus === "signing";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[var(--color-background)] p-4 text-center">
      <h1 className="font-sans text-6xl font-black uppercase tracking-tight md:text-9xl">
        Knox
      </h1>

      <div className="w-full max-w-[500px] space-y-6">
        <KnoxCard className="bg-white">
          <div className="space-y-4 p-4">
            <h2 className="text-2xl font-black uppercase">Initialize System</h2>
            <p className="font-mono text-sm leading-relaxed text-gray-600">
              No local vault storage found. Connect your wallet and sign the
              initialization message to create your secure encrypted session.
            </p>
          </div>
        </KnoxCard>

        {isConnected && !isWorking && (
          <KnoxCard
            className="animate-in fade-in slide-in-from-bottom-2 duration-300"
            variant="active"
          >
            <div className="flex items-center gap-3">
              <WalletCards className="h-6 w-6 shrink-0" />
              <div>
                <h3 className="text-left font-bold uppercase text-white">
                  Wallet Connected
                </h3>
                <p className="font-mono text-xs">{walletPkh}</p>
              </div>
            </div>
          </KnoxCard>
        )}

        {displayError && (
          <KnoxCard className="text-left" variant="danger">
            <h3 className="font-black uppercase tracking-wide">
              Initialization Failed
            </h3>
            <p className="mt-2 font-mono text-xs">{displayError}</p>
          </KnoxCard>
        )}

        <KnoxCard
          asButton
          disabled={isWorking}
          className={clsx(
            "group flex w-full items-center justify-center gap-3 py-5 text-xl font-black uppercase text-white transition-all",
            isWorking && "cursor-wait bg-gray-500",
            !isWorking && "bg-black hover:bg-[var(--color-primary)]",
          )}
          onClick={() => {
            void (isConnected ? handleSignAndInitialize() : handleConnect());
          }}
        >
          {isWorking ? (
            <KnoxLoader className="h-6 w-6" />
          ) : (
            <Wallet className="h-6 w-6" />
          )}

          <span>
            {isConnecting
              ? "Connecting..."
              : authStatus === "signing"
                ? "Awaiting Signature..."
                : isConnected
                  ? "Sign to Initialize"
                  : "Connect Wallet"}
          </span>
        </KnoxCard>
      </div>
    </div>
  );
}
