import { AlertTriangle } from "lucide-react";
import { KnoxCard } from "@/components/ui/knox-card";
import { KnoxLoader } from "@/components/ui/knox-loader";
import type { Vault } from "@/store/vault-store";
import { calculateTotalBalance } from "@/lib/nockchain/asset-utils";
import { useVaultBalance } from "@/hooks/useVaultBalance";

export function VaultCard({ vault }: { vault: Vault }) {
	const {
		data: notes,
		isLoading,
		isError,
		error,
	} = useVaultBalance(vault.address);

	const totalBalance = notes ? calculateTotalBalance(notes) : 0;

	return (
		//
		<KnoxCard
			asButton
			className="flex h-full flex-col justify-between gap-4 bg-white hover:border-[var(--color-primary)]"
		>
			<div>
				<h3 className="truncate text-xl font-black uppercase">{vault.name}</h3>
				<p className="mt-2 truncate font-mono text-xs text-gray-500">
					{vault.address}
				</p>
			</div>
			<div className="mt-4 flex items-center justify-between border-t-[3px] border-black pt-4">
				<div className="flex items-center gap-2">
					<div className="bg-[var(--color-primary)] px-2 py-1 text-[10px] font-bold text-white">
						{vault.threshold}-of-{vault.signers.length}
					</div>
					<span className="font-mono text-xs uppercase text-gray-500">
						Multisig
					</span>
				</div>
				<div className="font-mono text-sm font-bold">
					{isLoading ? (
						<KnoxLoader className="h-4 w-4" />
					) : isError ? (
						<div
							className="group relative flex items-center gap-1 text-red-500"
							title={error.message}
						>
							<AlertTriangle className="h-4 w-4" />
							<span className="text-xs">Error</span>
						</div>
					) : (
						<span>{totalBalance.toFixed(4)} NOCK</span>
					)}
				</div>
			</div>
		</KnoxCard>
	);
}
