import { CheckCircle, Circle, Send, Share2, Signature } from "lucide-react";
import type { NPST, NpstSignature } from "@/types/npst-engine";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { KnoxCard } from "@/components/ui/knox-card";
import { KnoxLoader } from "@/components/ui/knox-loader";
import { ShareProposalModal } from "@/components/vaults/ShareProposalModal";
import { decodeNpst } from "@/lib/npst-engine";
import { nicksToNock } from "@/lib/nockchain/asset-utils";
import { savePendingProposal } from "@/lib/storage";
import { submitTransaction } from "@/lib/nockchain/vault-utils";
import { useAuthStore } from "@/store/auth-store";
import { useVaultStore } from "@/store/vault-store";
import { useWalletStore } from "@/store/wallet-store";
import { wasm } from "@nockbox/iris-sdk";
import { z } from "zod";

const proposalSearchSchema = z.object({
	proposal: z.string().optional(),
});

function ProposalPage() {
	// eslint-disable-next-line no-use-before-define
	const { proposal: proposalString } = Route.useSearch();
	const navigate = useNavigate();
	const { vaults } = useVaultStore();
	const { provider, grpcClient, walletPkh } = useWalletStore();
	const { isAuthenticated } = useAuthStore();

	const [proposal, setProposal] = useState<NPST | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isProcessing, setIsProcessing] = useState(true);
	const [showShareModal, setShowShareModal] = useState(false);
	const [successTxId, setSuccessTxId] = useState<string | null>(null);

	useEffect(() => {
		if (!proposalString) {
			void navigate({ to: "/dashboard" });

			return;
		}

		try {
			const decoded = decodeNpst(proposalString);

			setProposal(decoded);

			const updateLocalProposal = async () => {
				let rawTx;

				try {
					rawTx = wasm.RawTx.fromProtobuf(decoded.rawTxProto);

					const txId = rawTx.id.value;

					const sourceVault = vaults.find(
						(v) => v.address === decoded.context.vaultAddress
					);

					if (sourceVault) {
						await savePendingProposal({
							id: txId,
							vaultId: sourceVault.id,
							proposal: decoded,
							createdAt: Date.now(),
						});
					}
				} finally {
					rawTx?.free();
				}
			};

			void updateLocalProposal();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Invalid proposal link.");
		} finally {
			setIsProcessing(false);
		}
	}, [proposalString, navigate, vaults]);

	const sourceVault = proposal
		? vaults.find((v) => v.address === proposal.context.vaultAddress)
		: undefined;

	const handleSign = async () => {
		if (!proposal || !provider || !walletPkh) {
			setError("Cannot sign: Proposal, wallet, or vault is not ready.");
			return;
		}
		setIsProcessing(true);
		try {
			const notes = proposal.notesProto.map((p) => wasm.Note.fromProtobuf(p));

			const spendConditions = proposal.spendConditionsProto.map((p) =>
				wasm.SpendCondition.fromProtobuf(p)
			);

			const signedTxProto = await provider.signRawTx({
				rawTx: proposal.rawTxProto,
				notes: notes.map((n) => n.toProtobuf()),
				spendConditions: spendConditions.map((sc) => sc.toProtobuf()),
			});

			const newSignature: NpstSignature = {
				pkh: walletPkh,
				signature: new Uint8Array(),
			};

			const updatedProposal: NPST = {
				...proposal,
				rawTxProto: signedTxProto,
				signatures: [...proposal.signatures, newSignature],
			};

			setProposal(updatedProposal);

			if (
				sourceVault &&
				updatedProposal.signatures.length < sourceVault.threshold
			) {
				setShowShareModal(true);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Signing failed.");
		} finally {
			setIsProcessing(false);
		}
	};

	const handleTransmit = async () => {
		if (!grpcClient || !proposal) {
			setError("Network client not ready.");

			return;
		}

		setIsProcessing(true);
		let rawTx: wasm.RawTx | undefined;

		try {
			rawTx = wasm.RawTx.fromProtobuf(proposal.rawTxProto);

			const txId = rawTx.id.value;

			await submitTransaction(grpcClient, proposal.rawTxProto);

			setSuccessTxId(txId);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Broadcast failed.");

			setIsProcessing(false);
		} finally {
			rawTx?.free();
		}
	};

	if (successTxId) {
		return (
			<AppShell>
				{showShareModal && sourceVault && (
					<ShareProposalModal
						npst={proposal!}
						vaultId={sourceVault.id}
						onClose={() => {
							setShowShareModal(false);
						}}
					/>
				)}
				<KnoxCard className="bg-white text-center p-8 space-y-6">
					<CheckCircle className="h-16 w-16 mx-auto text-green-500" />
					<h2 className="text-2xl font-black uppercase">
						Transaction Broadcast
					</h2>
					<p className="font-mono text-sm text-gray-600">
						Your transaction has been submitted to the network.
					</p>
					<div className="border-[3px] border-black bg-gray-100 p-4 space-y-1">
						<p className="text-xs font-bold uppercase">Transaction ID</p>
						<p className="font-mono text-xs break-all">{successTxId}</p>
					</div>
					<KnoxCard
						asButton
						className="w-full"
						variant="active"
						onClick={() => navigate({ to: "/dashboard" })}
					>
						Back to Dashboard
					</KnoxCard>
				</KnoxCard>
			</AppShell>
		);
	}

	if (isProcessing) {
		return (
			<AppShell>
				<KnoxLoader className="mx-auto h-12 w-12" />
			</AppShell>
		);
	}

	if (error) {
		return (
			<AppShell>
				<KnoxCard variant="danger">{error}</KnoxCard>
			</AppShell>
		);
	}

	if (!proposal || !sourceVault) {
		return (
			<AppShell>
				<KnoxCard variant="warning">
					Could not find a matching local vault for this proposal. Ensure you
					have the vault saved in Knox.
				</KnoxCard>
			</AppShell>
		);
	}

	const amount = nicksToNock(BigInt(proposal.context.amountToSendNicks));
	const fee = nicksToNock(BigInt(proposal.context.feeNicks));

	const hasUserSigned =
		walletPkh && proposal.signatures.some((sig) => sig.pkh === walletPkh);

	const thresholdMet = proposal.signatures.length >= sourceVault.threshold;

	const ActionButton = () => {
		if (!isAuthenticated) {
			return <p>Please unlock your wallet to sign.</p>;
		}

		if (hasUserSigned) {
			if (thresholdMet) {
				return (
					<button
						className="flex w-full items-center justify-center gap-2 h-14 border-[3px] border-black bg-green-500 font-bold uppercase text-white shadow-hard hover:bg-green-600 active-shadow-none disabled:bg-gray-400"
						disabled={isProcessing}
						onClick={() => void handleTransmit()}
					>
						<Send /> {isProcessing ? "Transmitting..." : "Transmit Transaction"}
					</button>
				);
			}

			return (
				<button
					className="flex w-full items-center justify-center gap-2 h-14 border-[3px] border-black bg-gray-700 font-bold uppercase text-white shadow-hard hover:bg-black active-shadow-none"
					onClick={() => {
						setShowShareModal(true);
					}}
				>
					<Share2 /> Share for Next Signature
				</button>
			);
		}

		return (
			<button
				className="flex w-full items-center justify-center gap-2 h-14 border-[3px] border-black bg-blue-500 font-bold uppercase text-white shadow-hard hover:bg-blue-600 active-shadow-none disabled:bg-gray-400"
				disabled={isProcessing}
				onClick={() => void handleSign()}
			>
				<Signature /> {isProcessing ? "Signing..." : "Approve & Sign"}
			</button>
		);
	};

	return (
		<AppShell>
			{showShareModal && sourceVault && (
				<ShareProposalModal
					npst={proposal}
					vaultId={sourceVault.id}
					onClose={() => {
						setShowShareModal(false);
					}}
				/>
			)}
			<h2 className="text-4xl font-black uppercase tracking-tight">
				Review Proposal
			</h2>
			<KnoxCard className="bg-white space-y-6">
				<div>
					<p className="font-mono text-sm uppercase text-gray-500">
						From Vault
					</p>
					<p className="text-xl font-bold">
						{proposal.context.sourceVaultName}
					</p>
				</div>
				<div className="border-[3px] border-black bg-gray-100 p-4 space-y-3 font-mono">
					<p>
						SEND:{" "}
						<strong className="font-bold text-lg">
							{amount.toFixed(4)} NOCK
						</strong>
					</p>
					<p>
						TO:{" "}
						<strong className="break-all">
							{proposal.context.recipientAddress}
						</strong>
					</p>
					<p className="text-xs">FEE: {fee.toFixed(4)} NOCK</p>
				</div>

				<div>
					<p className="font-bold uppercase mb-2">
						Signature Status ({proposal.signatures.length}/
						{sourceVault.threshold})
					</p>
					<ul className="list-disc list-inside font-mono text-sm space-y-2">
						{sourceVault.signers.map((signerPkh) => {
							const sig = proposal.signatures.find((s) => s.pkh === signerPkh);
							return (
								<li key={signerPkh} className="flex items-center gap-2">
									{sig ? (
										<CheckCircle className="h-4 w-4 text-green-600" />
									) : (
										<Circle className="h-4 w-4 text-gray-400" />
									)}
									<span className="truncate">{signerPkh}</span>
								</li>
							);
						})}
					</ul>
				</div>

				<div className="mt-6 border-t-[3px] border-black pt-6">
					<ActionButton />
				</div>
			</KnoxCard>
		</AppShell>
	);
}

export const Route = createFileRoute("/proposal")({
	validateSearch: proposalSearchSchema,
	component: ProposalPage,
});
