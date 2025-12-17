import { Check, Copy, FileText, QrCode } from "lucide-react";
import { useEffect, useState } from "react";

import { KnoxCard } from "../ui/knox-card";
import type { NPST } from "@/types/npst-engine";
import QRCode from "react-qr-code";
import { encodeNpst } from "@/lib/npst-engine";
import { savePendingProposal } from "@/lib/storage";
import { wasm } from "@nockbox/iris-sdk";

interface ShareProposalModalProps {
	npst: NPST;
	vaultId: string;
	onClose: () => void;
}

export function ShareProposalModal({
	npst,
	onClose,
	vaultId,
}: ShareProposalModalProps) {
	const [magicLinkCopied, setMagicLinkCopied] = useState(false);
	const [textBlobCopied, setTextBlobCopied] = useState(false);
	const [showQr, setShowQr] = useState(false);

	useEffect(() => {
		const save = async () => {
			let rawTx;

			try {
				rawTx = wasm.RawTx.fromProtobuf(npst.rawTxProto);

				const txId = rawTx.id.value;

				await savePendingProposal({
					id: txId,
					vaultId,
					proposal: npst,
					createdAt: Date.now(),
				});
			} catch (e) {
				console.error("Failed to save pending proposal", e);
			} finally {
				rawTx?.free();
			}
		};

		void save();
	}, [npst, vaultId]);

	const encodedData = encodeNpst(npst);

	const magicLink = `${window.location.origin}/dashboard?proposal=${encodedData}`;

	const textBlob = `knox:proposal:v1:${encodedData}`;

	const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
		void navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => {
			setCopied(false);
		}, 2500);
	};

	const isLinkTooLong = magicLink.length > 2000;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in">
			<div className="relative w-full max-w-lg animate-in fade-in zoom-in-95">
				<KnoxCard className="bg-white p-6">
					<div className="mb-4 flex items-center justify-between">
						<h2 className="text-2xl font-black uppercase">Share Proposal</h2>
						<button
							className="text-2xl font-black leading-none"
							onClick={onClose}
						>
							&times;
						</button>
					</div>
					<p className="font-mono text-sm text-gray-600">
						Share this proposal with other signers. They will be prompted to
						review the exact same transaction details and add their signature.
					</p>

					<div className="mt-6 space-y-4">
						{showQr ? (
							<div className="flex flex-col items-center gap-4">
								<div className="w-full max-w-[256px] border-[3px] border-black bg-white p-4 shadow-hard">
									<QRCode
										className="h-auto w-full"
										size={256}
										value={textBlob}
										viewBox={`0 0 256 256`}
									/>
								</div>
								<button
									className="w-full border-[3px] border-black py-2 font-bold uppercase hover:bg-gray-100"
									onClick={() => {
										setShowQr(false);
									}}
								>
									Show Text Methods
								</button>
							</div>
						) : (
							<>
								<h3 className="font-mono text-xs font-bold uppercase">
									Magic Link (Recommended)
								</h3>
								<div className="flex items-stretch gap-2">
									<input
										readOnly
										className="w-full flex-1 rounded-none border-[3px] border-black bg-gray-100 p-2 font-mono text-xs"
										disabled={isLinkTooLong}
										value={magicLink}
									/>
									<button
										className="flex w-24 items-center justify-center gap-2 border-[3px] border-black bg-blue-500 font-bold uppercase text-white hover:bg-blue-600 disabled:bg-gray-400"
										disabled={isLinkTooLong}
										onClick={() => {
											copyToClipboard(magicLink, setMagicLinkCopied);
										}}
									>
										{magicLinkCopied ? <Check /> : <Copy />}
									</button>
								</div>
								{isLinkTooLong && (
									<p className="font-mono text-[10px] text-yellow-600">
										Magic Link is too long for some browsers. Use Text Blob
										instead.
									</p>
								)}

								<h3 className="font-mono text-xs font-bold uppercase">
									Text Blob (For Large Transactions)
								</h3>
								<div className="flex items-stretch gap-2">
									<textarea
										readOnly
										className="w-full flex-1 resize-none rounded-none border-[3px] border-black bg-gray-100 p-2 font-mono text-xs"
										rows={4}
										value={textBlob}
									/>
									<button
										className="flex w-24 items-center justify-center gap-2 border-[3px] border-black bg-blue-500 font-bold uppercase text-white hover:bg-blue-600"
										onClick={() => {
											copyToClipboard(textBlob, setTextBlobCopied);
										}}
									>
										{textBlobCopied ? <Check /> : <FileText />}
									</button>
								</div>
								<div className="border-t-[3px] border-black pt-4">
									<button
										className="flex w-full items-center justify-center gap-3 border-[3px] border-black bg-gray-800 py-3 font-bold uppercase text-white hover:bg-black"
										onClick={() => {
											setShowQr(true);
										}}
									>
										<QrCode /> Show QR Code (for Air-Gapped Signing)
									</button>
								</div>
							</>
						)}
					</div>
				</KnoxCard>
			</div>
		</div>
	);
}
