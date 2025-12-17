import { FileInput, QrCode, X } from "lucide-react";

import { KnoxCard } from "../ui/knox-card";
import { QrScannerModal } from "./QrScannerModal";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export function ImportProposal() {
	const navigate = useNavigate();
	const [proposalText, setProposalText] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isScannerOpen, setScannerOpen] = useState(false);

	const PROPOSAL_PREFIX = "knox:proposal:v1:";

	const handleNavigate = (data: string) => {
		let encodedData = data.trim();

		if (encodedData.startsWith(PROPOSAL_PREFIX)) {
			encodedData = encodedData.substring(PROPOSAL_PREFIX.length);
		}

		if (!encodedData) {
			setError("Scanned data is empty or invalid.");

			return;
		}

		void navigate({
			to: "/proposal",
			search: { proposal: encodedData },
		});
	};

	const handleImport = () => {
		setError(null);

		let encodedData = proposalText.trim();

		if (encodedData.startsWith(PROPOSAL_PREFIX)) {
			encodedData = encodedData.substring(PROPOSAL_PREFIX.length);
		}

		if (!encodedData) {
			setError("Please paste a proposal text blob.");

			return;
		}

		void navigate({
			to: "/proposal",
			search: { proposal: encodedData },
		});
	};

	const hasText = proposalText.trim().length > 0;

	return (
		<div>
			{isScannerOpen && (
				<QrScannerModal
					onClose={() => {
						setScannerOpen(false);
					}}
					onScan={(data) => {
						setScannerOpen(false);
						handleNavigate(data);
					}}
				/>
			)}

			<h2 className="mb-4 text-3xl font-black uppercase tracking-tight">
				Paste or Scan Proposal
			</h2>

			<KnoxCard className="bg-white">
				<div className="flex items-center justify-between border-b-[3px] border-black p-4">
					<div className="flex items-center gap-3">
						<FileInput className="h-5 w-5" />

						<p className="font-mono text-sm font-bold uppercase">
							Paste or Scan Proposal
						</p>
					</div>
					<KnoxCard
						asButton
						className="flex items-center gap-2 px-3 py-2 text-xs"
						onClick={() => {
							setScannerOpen(true);
						}}
					>
						<QrCode className="h-4 w-4" />
						Scan
					</KnoxCard>
				</div>
				<div className="p-6">
					<textarea
						className="w-full resize-none rounded-none border-[3px] border-black bg-gray-50 p-3 font-mono text-xs focus:bg-white"
						placeholder="knox:proposal:v1:..."
						rows={5}
						value={proposalText}
						onChange={(e) => {
							setProposalText(e.target.value);
						}}
					/>
					{error && (
						<p className="mt-2 text-xs font-bold text-red-500">{error}</p>
					)}
					<div className="mt-4 flex gap-4">
						<KnoxCard
							asButton
							disabled={!hasText}
							title="Clear Input"
							className={cn(
								"flex w-16 items-center justify-center bg-white p-0",
								!hasText &&
									"cursor-not-allowed !bg-gray-100 text-gray-300 !shadow-none active:!translate-y-0"
							)}
							onClick={() => {
								if (hasText) {
									setProposalText("");
									setError(null);
								}
							}}
						>
							<X className="mx-auto" />
						</KnoxCard>
						<KnoxCard
							asButton
							variant="active"
							className={cn(
								"flex flex-1 items-center justify-center text-center font-bold uppercase",
								!hasText &&
									"cursor-not-allowed !bg-gray-300 text-gray-500 !shadow-none active:!translate-y-0"
							)}
							onClick={handleImport}
						>
							Import and Review
						</KnoxCard>
					</div>
				</div>
			</KnoxCard>
		</div>
	);
}
