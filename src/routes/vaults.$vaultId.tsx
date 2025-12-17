import { ArrowLeft, Copy } from "lucide-react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { KnoxCard } from "@/components/ui/knox-card";
import { KnoxLoader } from "@/components/ui/knox-loader";
import { SendModal } from "@/components/vaults/SendModal";
import { calculateTotalBalance } from "@/lib/nockchain/asset-utils";
import { useVaultBalance } from "@/hooks/useVaultBalance";
import { useVaultStore } from "@/store/vault-store";

function VaultDetailComponent() {
	// eslint-disable-next-line no-use-before-define
	const { vaultId } = Route.useParams();
	const navigate = useNavigate();
	const { vaults } = useVaultStore();
	const [isSendModalOpen, setSendModalOpen] = useState(false);

	const [isCopied, setIsCopied] = useState(false);
	const vault = vaults.find((v) => v.id === vaultId);

	const { data: notes, isLoading, error } = useVaultBalance(vault?.address);

	useEffect(() => {
		if (!vault) {
			void navigate({ to: "/dashboard" });
		}
	}, [vault, navigate]);

	if (!vault) {
		return (
			<AppShell>
				<div className="flex h-64 items-center justify-center">
					<p className="font-mono text-gray-500">
						Vault not found. Redirecting to dashboard...
					</p>
				</div>
			</AppShell>
		);
	}

	const handleCopy = () => {
		if (!vault) {
			return;
		}

		void navigator.clipboard.writeText(vault.address);

		setIsCopied(true);

		setTimeout(() => {
			setIsCopied(false);
		}, 2000);
	};

	const totalBalance = notes ? calculateTotalBalance(notes) : 0;

	return (
		<AppShell>
			{isSendModalOpen && notes && (
				<SendModal
					notes={notes}
					vault={vault}
					onClose={() => {
						setSendModalOpen(false);
					}}
				/>
			)}
			<div className="mb-8">
				<Link className="no-underline" to="/dashboard">
					<KnoxCard
						asButton
						className="mb-6 inline-flex w-auto items-center gap-2 px-4 py-2 text-xs"
					>
						<ArrowLeft className="h-4 w-4" />
						Back to All Vaults
					</KnoxCard>
				</Link>

				<div className="flex flex-wrap items-center justify-between gap-4">
					<div>
						<h2 className="text-4xl font-black uppercase tracking-tight">
							{vault.name}
						</h2>
						<p className="mt-1 break-all font-mono text-sm text-gray-500">
							{vault.address}
						</p>
						<button title="Copy Address" onClick={handleCopy}>
							<Copy className="h-5 w-5 text-gray-400 hover:text-blue-500" />
						</button>
						{isCopied && (
							<span className="text-xs font-bold text-blue-500">Copied!</span>
						)}
					</div>
					<div className="flex gap-4">
						<KnoxCard className="p-0 text-white" variant="active">
							<button
								className="px-6 py-3 font-bold uppercase tracking-wide disabled:cursor-not-allowed disabled:bg-gray-400"
								disabled={!notes || notes.length === 0}
								onClick={() => {
									setSendModalOpen(true);
								}}
							>
								Send
							</button>
						</KnoxCard>
					</div>
				</div>
			</div>

			<KnoxCard className="bg-white p-0">
				<div className="flex items-center justify-between border-b-[3px] border-black p-4">
					<h3 className="font-bold uppercase">Assets</h3>
					<div className="font-mono text-sm font-bold">
						Total: {totalBalance.toFixed(4)} NOCK
					</div>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full min-w-[600px] border-collapse text-left">
						<thead className="border-b-[3px] border-black bg-gray-100 font-mono text-xs uppercase">
							<tr>
								<th className="p-3">Amount</th>
								<th className="p-3">Note Name</th>
							</tr>
						</thead>
						<tbody>
							{isLoading ? (
								<tr>
									<td className="p-8 text-center" colSpan={2}>
										<KnoxLoader className="mx-auto h-8 w-8" />
									</td>
								</tr>
							) : error ? (
								<tr>
									<td
										className="p-8 text-center font-mono text-sm text-red-500"
										colSpan={2}
									>
										Error: {error.message}
									</td>
								</tr>
							) : notes?.length === 0 ? (
								<tr>
									<td
										className="p-8 text-center font-mono text-sm uppercase text-gray-500"
										colSpan={2}
									>
										This vault has no funds.
									</td>
								</tr>
							) : (
								notes?.map((note, index) => (
									<tr key={index} className="border-b-[2px] border-gray-100">
										<td className="p-3 font-mono font-bold">
											{note.amountAsNock.toFixed(4)} NOCK
										</td>
										<td className="p-3 font-mono text-xs">
											[{note.firstName} {note.lastName}]
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</KnoxCard>
		</AppShell>
	);
}

export const Route = createFileRoute("/vaults/$vaultId")({
	component: VaultDetailComponent,
});
