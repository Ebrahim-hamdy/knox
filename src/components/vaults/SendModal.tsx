import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Send } from "lucide-react";
import { useState } from "react";
import type { Vault } from "@/store/vault-store";
import {
	type DisplayNote,
	nicksToNock,
	calculateTotalBalance,
} from "@/lib/nockchain/asset-utils";
import {
	selectNotesForTransaction,
	InsufficientFundsError,
	type CoinSelectionResult,
} from "@/lib/nockchain/coin-selection";
import { KnoxCard } from "@/components/ui/knox-card";
import { KnoxLoader } from "@/components/ui/knox-loader";
import {
	buildSendTx,
	type BuiltTransaction,
} from "@/lib/nockchain/transaction-builder";
import { ShareProposalModal } from "./ShareProposalModal";
import type { NPST } from "@/types/npst-engine";

const sendSchema = z.object({
	recipient: z.string().min(40, "Invalid address format"),
	amount: z.coerce.number().positive("Amount must be positive"),
	fee: z.coerce.number().min(0.0001, "Fee must be at least 0.0001"),
});

type SendFormValues = z.infer<typeof sendSchema>;

interface SendModalProps {
	vault: Vault;
	notes: Array<DisplayNote>;
	onClose: () => void;
}

interface TxDetails {
	formValues: SendFormValues;
	selection: CoinSelectionResult;
	builtTx: BuiltTransaction;
}

type ModalStep = "form" | "review" | "generating";

export function SendModal({ vault, notes, onClose }: SendModalProps) {
	const [step, setStep] = useState<ModalStep>("form");
	const [error, setError] = useState<string | null>(null);
	const [txDetails, setTxDetails] = useState<TxDetails | null>(null);
	const [generatedNpst, setGeneratedNpst] = useState<NPST | null>(null);

	const [showShareModal, setShowShareModal] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm({
		resolver: zodResolver(sendSchema),
		defaultValues: {
			recipient: "",
			amount: undefined,
			fee: 0.1,
		},
	});

	const totalBalance = calculateTotalBalance(notes);

	const onSubmit: SubmitHandler<SendFormValues> = async (data) => {
		setError(null);
		setStep("generating");
		try {
			const amountToSend = BigInt(Math.round(data.amount * 65536));
			const fee = BigInt(Math.round(data.fee * 65536));

			const selection = selectNotesForTransaction(notes, amountToSend, fee);

			const builtTx = await buildSendTx({
				inputNotes: selection.selectedNotes,
				sourceVault: vault,
				recipientAddress: data.recipient,
				amountToSend,
				fee,
			});

			setTxDetails({ formValues: data, selection, builtTx });

			setStep("review");
		} catch (err) {
			if (err instanceof InsufficientFundsError) {
				setError(err.message);
			} else {
				setError(
					err instanceof Error ? err.message : "Failed to create transaction."
				);
			}

			setStep("form");
		}
	};

	const handleGenerateProposal = () => {
		if (!txDetails) return;

		const npst: NPST = {
			rawTxProto: txDetails.builtTx.rawTxProto,
			notesProto: txDetails.builtTx.notesProto,
			spendConditionsProto: txDetails.builtTx.spendConditionsProto,
			context: {
				vaultAddress: vault.address,
				recipientAddress: txDetails.formValues.recipient,
				amountToSendNicks: (txDetails.formValues.amount * 65536).toString(),
				feeNicks: (txDetails.formValues.fee * 65536).toString(),
				changeAmountNicks: txDetails.selection.changeAmount.toString(),
				sourceVaultName: vault.name,
			},
			signatures: [],
		};

		setGeneratedNpst(npst);
		setShowShareModal(true);
	};

	const renderContent = () => {
		if (step === "generating") {
			return (
				<div className="flex flex-col items-center justify-center gap-4 py-8">
					<KnoxLoader className="h-10 w-10" />
					<p className="font-mono text-sm uppercase">Building Transaction...</p>
				</div>
			);
		}

		if (step === "review" && txDetails) {
			return (
				<>
					{showShareModal && generatedNpst && (
						<ShareProposalModal
							npst={generatedNpst}
							vaultId={vault.id}
							onClose={() => {
								setShowShareModal(false);
								onClose();
							}}
						/>
					)}

					<form
						className="space-y-6"
						onSubmit={(e) => {
							e.preventDefault();
							if (!generatedNpst) {
								handleGenerateProposal();
							}
						}}
					>
						<h3 className="text-xl font-black uppercase">Review Transaction</h3>
						<div className="space-y-4 rounded-none border-[3px] border-black bg-[var(--color-background)] p-4 font-mono text-sm">
							<p>
								SEND:{" "}
								<strong className="font-bold">
									{txDetails.formValues.amount.toFixed(4)} NOCK
								</strong>
							</p>
							<p className="flex flex-wrap items-center">
								<span>TO:&nbsp;</span>
								<strong className="break-all font-bold">
									{txDetails.formValues.recipient}
								</strong>
							</p>
							<hr className="border-t-2 border-dashed border-gray-300" />
							<p>FEE: {txDetails.formValues.fee.toFixed(4)} NOCK</p>
							<p>
								CHANGE:{" "}
								{nicksToNock(txDetails.selection.changeAmount).toFixed(4)} NOCK
							</p>
							<p>
								TOTAL:{" "}
								{nicksToNock(txDetails.selection.totalSelectedAmount).toFixed(
									4
								)}{" "}
								NOCK
							</p>
						</div>
						<div className="flex gap-4">
							<KnoxCard
								asButton
								className="w-1/3 text-center font-bold uppercase"
								onClick={() => {
									setStep("form");
								}}
							>
								<ArrowLeft className="mx-auto" />
							</KnoxCard>
							<button
								className="h-14 flex-1 border-[3px] border-black bg-blue-500 font-bold uppercase text-white shadow-[4px_4px_0px_#000000] hover:bg-blue-600 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:bg-gray-400"
								disabled={!!generatedNpst}
								type="submit"
							>
								{generatedNpst ? "Proposal Generated" : "Generate Proposal"}
							</button>
						</div>
					</form>
				</>
			);
		}

		return (
			<form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
				<div>
					<label className="font-mono text-sm font-bold uppercase">
						Recipient Address
					</label>
					<input
						{...register("recipient")}
						className="mt-1 w-full p-2 font-mono text-sm"
					/>
					{errors.recipient && (
						<p className="mt-1 font-mono text-xs text-red-500">
							{errors.recipient.message}
						</p>
					)}
				</div>
				<div className="flex gap-4">
					<div className="w-2/3">
						<label className="font-mono text-sm font-bold uppercase">
							Amount (NOCK)
						</label>
						<input
							{...register("amount")}
							className="mt-1 w-full p-2 font-mono text-sm"
							step="0.0001"
							type="number"
						/>
						{errors.amount && (
							<p className="mt-1 font-mono text-xs text-red-500">
								{errors.amount.message}
							</p>
						)}
					</div>
					<div className="w-1/3">
						<label className="font-mono text-sm font-bold uppercase">Fee</label>
						<input
							{...register("fee")}
							className="mt-1 w-full p-2 font-mono text-sm"
							step="0.0001"
							type="number"
						/>
						{errors.fee && (
							<p className="mt-1 font-mono text-xs text-red-500">
								{errors.fee.message}
							</p>
						)}
					</div>
				</div>
				{error && (
					<KnoxCard className="p-3 font-mono text-xs" variant="danger">
						{error}
					</KnoxCard>
				)}
				<button
					className="flex h-14 w-full items-center justify-center gap-3 border-[3px] border-black bg-blue-500 font-bold uppercase text-white shadow-[4px_4px_0px_#000000] hover:bg-blue-600 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
					type="submit"
				>
					<Send className="h-5 w-5" /> Review Transaction
				</button>
			</form>
		);
	};

	return (
		<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in">
			<div className="relative w-full max-w-lg animate-in fade-in zoom-in-95">
				<KnoxCard className="bg-white p-6">
					<div className="mb-4 flex items-center justify-between">
						<h2 className="text-2xl font-black uppercase">
							Send from {vault.name}
						</h2>
						<button
							className="text-2xl font-black leading-none"
							onClick={onClose}
						>
							&times;
						</button>
					</div>
					<div className="text-right font-mono text-xs uppercase text-gray-500">
						Balance: {totalBalance.toFixed(4)} NOCK
					</div>
					<div className="mt-2">{renderContent()}</div>
				</KnoxCard>
			</div>
		</div>
	);
}
