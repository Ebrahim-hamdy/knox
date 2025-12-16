import type { DisplayNote } from "./asset-utils";
import type { Vault } from "@/store/vault-store";
import { ensureWasmLoaded } from "./wasm-loader";
import { wasm } from "@nockbox/iris-sdk";

interface TransactionBuildConfig {
	inputNotes: Array<DisplayNote>;
	sourceVault: Vault;
	recipientAddress: string;
	amountToSend: bigint;
	fee: bigint;
}

export interface BuiltTransaction {
	rawTxProto: Uint8Array;
	notesProto: Array<Uint8Array>;
	spendConditionsProto: Array<Uint8Array>;
}

const DEFAULT_FEE_PER_WORD = BigInt(32768); // 0.5 NOCK per word

export const buildSendTx = async (
	config: TransactionBuildConfig
): Promise<BuiltTransaction> => {
	await ensureWasmLoaded();

	let builder: wasm.TxBuilder | undefined;
	let recipientDigest: wasm.Digest | undefined;
	let refundDigest: wasm.Digest | undefined;
	let vaultSpendCondition: wasm.SpendCondition | undefined;

	try {
		const { inputNotes, sourceVault, recipientAddress, amountToSend, fee } =
			config;

		const rawNotes = inputNotes.map((n) => n.rawNote);

		vaultSpendCondition = wasm.SpendCondition.fromProtobuf(
			sourceVault.spendConditionProtobuf
		);

		const spendConditions = [vaultSpendCondition];

		builder = new wasm.TxBuilder(DEFAULT_FEE_PER_WORD);

		recipientDigest = new wasm.Digest(recipientAddress);
		refundDigest = new wasm.Digest(sourceVault.address);

		builder.simpleSpend(
			rawNotes,
			spendConditions,
			recipientDigest,
			amountToSend,
			fee,
			refundDigest,
			false
		);

		const tx = builder.build();
		const rawTx = tx.toRawTx();

		const txInputs = builder.allNotes();

		const rawTxProtobuf = rawTx.toProtobuf();
		const notesProto = txInputs.notes.map((n) => n.toProtobuf());
		const spendConditionsProto = txInputs.spendConditions.map((sc) =>
			sc.toProtobuf()
		);

		tx.free();
		rawTx.free();
		txInputs.free();

		return { rawTxProto: rawTxProtobuf, notesProto, spendConditionsProto };
	} catch (error) {
		console.error("Error building transaction:", error);

		const message =
			error instanceof Error ? error.message : "Failed to build transaction.";

		throw new Error(message);
	} finally {
		builder?.free();
		recipientDigest?.free();
		refundDigest?.free();
	}
};
