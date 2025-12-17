import { Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";

import { useAuthStore } from "@/store/auth-store";
import { useVaultStore, type Vault } from "@/store/vault-store";
import { KnoxCard } from "@/components/ui/knox-card";
import { KnoxLoader } from "@/components/ui/knox-loader";
import { saveEncryptedRecord } from "@/lib/storage";
import { encryptData } from "@/lib/crypto";
import { pkStringToPkh } from "@/lib/nockchain/address-utils";
import { useWalletStore } from "@/store/wallet-store";
import { generateVaultConfig } from "@/lib/nockchain/vault-utils";

const WizardHeader = ({ title }: { title: string }) => (
	<div className="mb-8 flex items-center justify-between border-b-[3px] border-black pb-4">
		<h2 className="text-3xl font-black uppercase">{title}</h2>
		<Link className="no-underline" search={{ view: undefined }} to="/dashboard">
			<KnoxCard
				asButton
				className="px-4 py-2 text-xs font-bold uppercase hover:bg-black hover:text-white"
			>
				Cancel
			</KnoxCard>
		</Link>
	</div>
);

const WizardStepCard = ({
	step,
	totalSteps,
	children,
}: {
	step: number;
	totalSteps: number;
	children: React.ReactNode;
}) => (
	<KnoxCard className="min-h-[400px] bg-white p-0">
		<div className="border-b-[3px] border-black bg-[var(--color-background)] p-4">
			<h3 className="font-mono text-sm font-bold uppercase">
				Configuration: Step {step} of {totalSteps}
			</h3>
		</div>
		<div className="p-8">{children}</div>
	</KnoxCard>
);

export function CreateVaultWizard() {
	const navigate = useNavigate();
	const { vaults, addVault } = useVaultStore();
	const { sessionKey } = useAuthStore();
	const { walletPkh, walletAddress } = useWalletStore();

	const [wizardStep, setWizardStep] = useState(1);
	const [vaultName, setVaultName] = useState("");
	const [threshold, setThreshold] = useState(1);
	const [signers, setSigners] = useState<Array<string>>([""]);
	const [error, setError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	const [generatedConfig, setGeneratedConfig] = useState<{
		address: string;
		spendConditionProtobuf: Uint8Array;
	} | null>(null);

	useEffect(() => {
		if (walletPkh && signers.length === 1 && signers[0] === "") {
			setSigners([walletPkh]);
		}
	}, [signers, walletPkh]);

	useEffect(() => {
		if (threshold > signers.length) {
			const diff = threshold - signers.length;
			setSigners((prev) => [...prev, ...Array(diff).fill("")]);
		}
	}, [threshold, signers.length]);

	const handleThresholdChange = (value: string) => {
		let numValue = parseInt(value, 10);

		if (isNaN(numValue)) {
			numValue = 1;
		}

		if (numValue < 1) {
			numValue = 1;
		}

		if (numValue > 20) {
			numValue = 20;
		}

		setThreshold(numValue);
	};

	const handleSignerChange = (index: number, value: string) => {
		const newSigners = [...signers];

		newSigners[index] = value;

		setSigners(newSigners);
	};

	const handleAddSigner = () => {
		setSigners((prev) => [...prev, ""]);
	};

	const handleRemoveSigner = (index: number) => {
		if (signers.length <= 1) return;
		const newSigners = signers.filter((_, i) => i !== index);

		setSigners(newSigners);

		if (threshold > newSigners.length) {
			setThreshold(newSigners.length);
		}
	};

	const handleSyncSignersToThreshold = () => {
		if (threshold < signers.length) {
			setSigners((prev) => prev.slice(0, threshold));
		}
	};

	const validateAndProceed = (
		validationFn: () => boolean,
		nextStep: number
	) => {
		setError(null);

		if (validationFn()) {
			setWizardStep(nextStep);
		}
	};

	const validateStep1 = () => {
		if (!vaultName.trim()) {
			setError("Vault Name cannot be empty.");

			return false;
		}

		if (threshold < 1) {
			setError("Threshold must be at least 1.");

			return false;
		}

		if (threshold > signers.length) {
			setError("Threshold cannot be greater than the number of signers.");

			return false;
		}

		return true;
	};

	const validateStep2 = () => {
		const filledSigners = signers.filter((s) => s.trim() !== "");

		if (filledSigners.length < signers.length) {
			setError("All signer fields must be filled.");

			return false;
		}

		try {
			const convertedPkhs = filledSigners.map(pkStringToPkh);
			const uniquePkhs = new Set(convertedPkhs);

			if (uniquePkhs.size !== convertedPkhs.length) {
				setError("Duplicate signer addresses are not allowed.");

				return false;
			}
		} catch (e) {
			if (e instanceof Error) {
				setError(`Invalid signer format: ${e.message}`);
			} else {
				setError("Invalid signer format.");
			}

			return false;
		}

		if (threshold > filledSigners.length) {
			setError(
				`Threshold (${threshold}) cannot be greater than the number of signers (${filledSigners.length}).`
			);

			return false;
		}

		return true;
	};

	const handleProceedToReview = async () => {
		if (!validateStep2()) {
			return;
		}

		setIsSaving(true);
		setError(null);

		try {
			const validSigners = signers.filter((s) => s.trim() !== "");
			const config = await generateVaultConfig(threshold, validSigners);

			const isDuplicate = vaults.some(
				(existingVault) => existingVault.address === config.address
			);

			if (isDuplicate) {
				throw new Error(
					"A vault with this exact signer configuration (threshold and signers) already exists."
				);
			}
			setGeneratedConfig(config);
			setWizardStep(3);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "An unknown error occurred."
			);
		} finally {
			setIsSaving(false);
		}
	};

	const handleSaveVault = async () => {
		if (!sessionKey || !generatedConfig) {
			setError(
				"Session expired or vault configuration is missing. Please restart."
			);

			return;
		}

		setIsSaving(true);
		setError(null);

		try {
			const newVault: Vault = {
				id: `vault_${Date.now()}`,
				name: vaultName.trim(),
				threshold,
				signers: signers.filter((s) => s.trim() !== ""),
				address: generatedConfig.address,
				spendConditionProtobuf: generatedConfig.spendConditionProtobuf,
				createdAt: Date.now(),
			};

			await saveEncryptedRecord(newVault.id, newVault, sessionKey, encryptData);

			addVault(newVault);

			await navigate({ to: "/dashboard" });
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Failed to save vault.";

			setError(msg);

			setIsSaving(false);
		}
	};

	return (
		<>
			<WizardHeader title="New Vault" />
			{error && (
				<KnoxCard className="mb-6 p-4 text-sm font-bold" variant="danger">
					{error}
				</KnoxCard>
			)}

			{wizardStep === 1 && (
				<WizardStepCard step={1} totalSteps={3}>
					<div className="flex max-w-lg flex-col gap-6">
						<div className="space-y-2">
							<label className="font-bold uppercase" htmlFor="vaultName">
								Vault Name
							</label>
							<input
								className="w-full px-4 py-3 font-mono text-sm uppercase focus:ring-0"
								id="vaultName"
								placeholder="E.g. Treasury Operations"
								type="text"
								value={vaultName}
								onChange={(e) => {
									setVaultName(e.target.value);
								}}
							/>
						</div>
						<div className="space-y-2">
							<label className="font-bold uppercase">
								Required Signers (M-of-N)
							</label>
							<div className="flex items-center gap-4">
								<input
									className="w-20 px-2 py-3 text-center font-mono"
									max={signers.length || 1}
									min="1"
									type="number"
									value={threshold}
									onChange={(e) => {
										handleThresholdChange(e.target.value);
									}}
								/>
								<div className="flex items-center font-mono text-sm uppercase opacity-50">
									of
								</div>
								<div className="relative flex items-center border-[3px] border-black bg-gray-200 px-6 py-3 font-mono font-bold text-gray-500">
									{signers.length} Total
								</div>
							</div>
							{signers.length > threshold && (
								<div className="mt-2 animate-in fade-in slide-in-from-bottom-2">
									<button
										className="flex w-full items-center justify-center gap-2 border-[2px] border-dashed border-black bg-yellow-100 py-2 text-center font-mono text-xs font-bold uppercase text-black hover:border-solid hover:bg-yellow-200"
										onClick={handleSyncSignersToThreshold}
									>
										<SlidersHorizontal className="h-4 w-4" />
										Adjust Total to {threshold} to match Required
									</button>
								</div>
							)}
						</div>
						<KnoxCard
							asButton
							className="mt-4 text-center font-bold uppercase"
							variant="active"
							onClick={() => {
								validateAndProceed(validateStep1, 2);
							}}
						>
							Next: Add Signers
						</KnoxCard>
					</div>
				</WizardStepCard>
			)}

			{wizardStep === 2 && (
				<WizardStepCard step={2} totalSteps={3}>
					<div className="space-y-4">
						<p className="font-bold uppercase">Signer Public Key Hashes</p>
						{signers.map((signer, index) => (
							<div key={index} className="flex items-center gap-2">
								<div className="flex-1 relative">
									<input
										className="flex-1 w-full px-4 py-3 font-mono text-sm uppercase pr-12"
										placeholder="Public Key or PKH..."
										type="text"
										value={signer}
										onChange={(e) => {
											handleSignerChange(index, e.target.value);
										}}
									/>
									{index === 0 &&
										(walletAddress || walletPkh) &&
										signer === (walletAddress || walletPkh) && (
											<span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold bg-gray-200 px-2 py-1 rounded pointer-events-none">
												YOU
											</span>
										)}
								</div>
								<button
									className="flex h-12 w-12 shrink-0 items-center justify-center border-[3px] border-black bg-white p-0 text-black hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:bg-gray-200 disabled:opacity-50"
									disabled={signers.length <= 1}
									type="button"
									onClick={() => {
										handleRemoveSigner(index);
									}}
								>
									<Trash2 className="h-5 w-5" />
								</button>
							</div>
						))}
						<button
							className="flex w-full items-center justify-center gap-2 border-[3px] border-dashed border-black bg-gray-100 py-3 font-mono text-xs uppercase text-gray-500 hover:border-solid hover:bg-white hover:text-black"
							type="button"
							onClick={handleAddSigner}
						>
							<Plus className="h-4 w-4" /> Add Another Signer
						</button>
					</div>
					<div className="mt-8 flex gap-4">
						<KnoxCard
							asButton
							className="flex-1 text-center font-bold uppercase"
							onClick={() => {
								setWizardStep(1);
							}}
						>
							Back
						</KnoxCard>
						<KnoxCard
							asButton
							className="flex-1 text-center font-bold uppercase"
							disabled={isSaving}
							variant="active"
							onClick={() => {
								void handleProceedToReview();
							}}
						>
							{isSaving && <KnoxLoader className="h-5 w-5" />}
							{isSaving ? "Generating..." : "Next: Review"}
						</KnoxCard>
					</div>
				</WizardStepCard>
			)}

			{wizardStep === 3 && (
				<WizardStepCard step={3} totalSteps={3}>
					<div className="space-y-6">
						<h3 className="text-xl font-black uppercase">Review Details</h3>
						<div className="space-y-4 rounded-none border-[3px] border-black bg-[var(--color-background)] p-4">
							<div>
								<p className="font-mono text-xs uppercase text-gray-500">
									Vault Name
								</p>
								<p className="font-bold uppercase">{vaultName}</p>
							</div>
							<div>
								<p className="font-mono text-xs uppercase text-gray-500">
									Configuration
								</p>
								<p className="font-bold uppercase">
									{threshold} of {signers.length} Multisig
								</p>
							</div>
							<div>
								<p className="font-mono text-xs uppercase text-gray-500">
									Signers
								</p>
								<ul className="list-inside list-disc space-y-1 font-mono text-sm">
									{signers.map((s, i) => (
										<li key={i} className="truncate">
											{s}
										</li>
									))}
								</ul>
							</div>
							<div>
								<p className="font-mono text-xs uppercase text-gray-500">
									Generated Vault Address
								</p>
								<p className="break-all font-mono text-sm font-bold">
									{generatedConfig?.address || "Error generating address"}
								</p>
							</div>
						</div>
						<p className="font-mono text-xs leading-relaxed text-gray-600">
							This is the permanent, on-chain address for your new vault.
							Double-check the signers before saving, as this cannot be changed.
						</p>
					</div>
					<div className="mt-8 flex gap-4">
						<KnoxCard
							asButton
							className="flex-1 text-center font-bold uppercase"
							disabled={isSaving}
							onClick={() => {
								setGeneratedConfig(null);
								setWizardStep(2);
							}}
						>
							Back
						</KnoxCard>
						<KnoxCard
							asButton
							className="flex flex-1 items-center justify-center gap-3 text-center font-bold uppercase"
							disabled={isSaving}
							variant="active"
							onClick={() => {
								void handleSaveVault();
							}}
						>
							{isSaving && <KnoxLoader className="h-5 w-5" />}
							{isSaving ? "Saving..." : "Save & Encrypt Vault"}
						</KnoxCard>
					</div>
				</WizardStepCard>
			)}
		</>
	);
}
