// NPST (Nockchain Proposal State Transfer) engine to securely share transaction proposals between signers

export interface NpstSignature {
	pkh: string;
	signature: Uint8Array;
}

export interface NpstContext {
	vaultAddress: string;
	recipientAddress: string;
	amountToSendNicks: string;
	feeNicks: string;
	changeAmountNicks: string;
	sourceVaultName: string;
}

export interface NPST {
	rawTxProto: Uint8Array;
	notesProto: Array<Uint8Array>;
	spendConditionsProto: Array<Uint8Array>;
	context: NpstContext;
	signatures: Array<NpstSignature>;
}
