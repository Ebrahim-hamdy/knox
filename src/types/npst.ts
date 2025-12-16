// src/types/npst.ts
// NPST (Nockchain Proposal State Transfer) engine to securely share transaction proposals between signers
/**
 * Defines a signature entry within an NPST object.
 */
export interface NpstSignature {
  pkh: string; // The raw PKH of the signer.
  signature: Uint8Array; // The resulting signature string.
  // signature: string; // The resulting signature string.
}

/**
 * The application-level context needed to verify and display the transaction.
 * This information is CRITICAL for preventing phishing, as the receiving client
 * will use it to reconstruct the human-readable summary from scratch.
 */
export interface NpstContext {
  vaultAddress: string;
  recipientAddress: string;
  amountToSendNicks: string; // Use string to safely serialize BigInt
  feeNicks: string; // Use string to safely serialize BigInt
  changeAmountNicks: string; // Use string to safely serialize BigInt
  // NEW: Add display name of the source vault
  sourceVaultName: string;
}

/**
 * Nockchain Proposal State Transfer (NPST) object.
 * This is the canonical data structure for sharing an unsigned or partially
 * signed transaction between participants in a multisig vault.
 */
export interface NPST {
  rawTxProto: Uint8Array;
  notesProto: Array<Uint8Array>;
  spendConditionsProto: Array<Uint8Array>;
  context: NpstContext;
  signatures: Array<NpstSignature>;
}
