import { AlertTriangle, CheckCircle, Download, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { KnoxCard } from "../ui/knox-card";
import { encryptData } from "@/lib/crypto";
import { saveEncryptedRecord } from "@/lib/storage";
import { useAuthStore } from "@/store/auth-store";
import { useVaultStore } from "@/store/vault-store";

type Feedback = {
	type: "success" | "error";
	message: string;
} | null;

export function BackupRestore() {
	const { vaults } = useVaultStore();
	const { sessionKey } = useAuthStore();

	const [exportFeedback, setExportFeedback] = useState<Feedback>(null);
	const [importFeedback, setImportFeedback] = useState<Feedback>(null);

	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleExport = async () => {
		setExportFeedback(null);
		setImportFeedback(null);

		if (!sessionKey || vaults.length === 0) {
			setExportFeedback({
				type: "error",
				message:
					vaults.length === 0 ? "No vaults to export." : "Session not active.",
			});

			return;
		}

		try {
			const encryptedBackup = await encryptData(vaults, sessionKey);
			const jsonString = JSON.stringify(encryptedBackup);

			const blob = new Blob([jsonString], { type: "application/json" });

			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");

			a.href = url;
			a.download = `knox-backup-${new Date().toISOString().split("T")[0]}.json`;

			a.click();

			URL.revokeObjectURL(url);

			a.remove();

			setExportFeedback({
				type: "success",
				message: "Vaults exported successfully.",
			});
		} catch {
			setExportFeedback({
				type: "error",
				message: "Failed to create encrypted backup.",
			});
		}
	};

	const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
		setExportFeedback(null);
		setImportFeedback(null);

		const file = event.target.files?.[0];

		if (!file) {
			return;
		}

		if (!sessionKey) {
			setImportFeedback({
				type: "error",
				message: "Session not active. Cannot import.",
			});

			return;
		}

		const reader = new FileReader();

		reader.onload = async (e) => {
			try {
				const text = e.target?.result;

				if (typeof text !== "string") {
					throw new Error("Invalid file content.");
				}

				const vaultsToImport = JSON.parse(text);

				if (!Array.isArray(vaultsToImport) || vaultsToImport.length === 0) {
					throw new Error("File does not contain a valid array of vaults.");
				}

				const savePromises = vaultsToImport.map((vault) => {
					if (!vault.id || !vault.name || !vault.address) {
						throw new Error("Invalid vault structure in backup file.");
					}

					return saveEncryptedRecord(vault.id, vault, sessionKey, encryptData);
				});

				await Promise.all(savePromises);

				setImportFeedback({
					type: "success",
					message: `${vaultsToImport.length} vault(s) imported. Please refresh the page.`,
				});

				setTimeout(() => {
					window.location.reload();
				}, 2500);
			} catch (err) {
				setImportFeedback({
					type: "error",
					message:
						err instanceof Error
							? err.message
							: "Failed to parse or import backup file.",
				});
			}
		};

		reader.readAsText(file);

		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const FeedbackMessage = ({ feedback }: { feedback: Feedback }) => {
		if (!feedback) {
			return null;
		}

		const isSuccess = feedback.type === "success";

		return (
			<div
				className={`mt-4 flex animate-in fade-in items-center gap-2 font-mono text-xs font-bold ${
					isSuccess ? "text-green-600" : "text-red-500"
				}`}
			>
				{isSuccess ? (
					<CheckCircle className="h-4 w-4" />
				) : (
					<AlertTriangle className="h-4 w-4" />
				)}
				{feedback.message}
			</div>
		);
	};

	return (
		<div className="mt-12">
			<h2 className="mb-4 text-3xl font-black uppercase tracking-tight">
				Vault Backup & Restore
			</h2>
			<KnoxCard className="bg-white p-2">
				<div className="grid grid-cols-1 gap-2 md:grid-cols-2">
					<div className="bg-gray-50 p-6">
						<div className="flex items-center gap-3">
							<Download />
							<p className="font-bold uppercase">Export Encrypted Backup</p>
						</div>
						<p className="mt-2 h-16 font-mono text-xs text-gray-600">
							Download a secure, encrypted backup of all your vaults. This file
							can only be decrypted with your wallet signature.
						</p>
						<KnoxCard
							asButton
							className="mt-4 w-full text-center font-bold uppercase disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
							disabled={vaults.length === 0}
							onClick={() => void handleExport()}
						>
							Export Vaults
						</KnoxCard>
						<FeedbackMessage feedback={exportFeedback} />
					</div>
					<div className="bg-gray-50 p-6">
						<div className="flex items-center gap-3">
							<Upload />
							<p className="font-bold uppercase">Import from Backup</p>
						</div>
						<p className="mt-2 h-16 font-mono text-xs text-gray-600">
							Import vaults from an unencrypted JSON backup file. They will be
							encrypted with your current session key upon import.
						</p>
						<input
							ref={fileInputRef}
							accept=".json"
							className="hidden"
							type="file"
							onChange={handleImport}
						/>
						<KnoxCard
							asButton
							className="mt-4 w-full text-center font-bold uppercase"
							onClick={() => fileInputRef.current?.click()}
						>
							Import Vaults
						</KnoxCard>
						<FeedbackMessage feedback={importFeedback} />
					</div>
				</div>
			</KnoxCard>
		</div>
	);
}
