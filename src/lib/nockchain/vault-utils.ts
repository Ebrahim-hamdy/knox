import { ensureWasmLoaded } from "./wasm-loader";
import { wasm } from "@nockbox/iris-sdk";

export interface VaultConfig {
	address: string;
	spendConditionProtobuf: Uint8Array;
}

export const generateVaultConfig = async (
	threshold: number,
	signers: Array<string>
): Promise<VaultConfig> => {
	await ensureWasmLoaded();

	let pkhObj: wasm.Pkh | undefined;
	let pkhPrimitive: wasm.LockPrimitive | undefined;
	let spendCondition: wasm.SpendCondition | undefined;
	let addressDigest: wasm.Digest | undefined;

	if (threshold > signers.length || threshold < 1) {
		throw new Error("Invalid threshold for the given number of signers.");
	}

	try {
		pkhObj = new wasm.Pkh(BigInt(threshold), signers);

		pkhPrimitive = wasm.LockPrimitive.newPkh(pkhObj);

		spendCondition = new wasm.SpendCondition([pkhPrimitive]);

		addressDigest = spendCondition.hash();
		const address = addressDigest.value;

		const spendConditionProtobuf = spendCondition.toProtobuf();

		return { address, spendConditionProtobuf };
	} catch (err) {
		console.error("WASM error during vault config generation:", err);

		const msg =
			err instanceof Error ? err.message : "Failed to generate vault config.";

		throw new Error(`WASM Error: ${msg}`);
	} finally {
		spendCondition?.free();
		addressDigest?.free();
	}
};

export const submitTransaction = async (
	grpcClient: wasm.GrpcClient,
	signedTxProto: Uint8Array
): Promise<string> => {
	if (!grpcClient) {
		throw new Error("gRPC client is not initialized.");
	}

	try {
		const response = await grpcClient.sendTransaction(signedTxProto);
		const txId = response?.id || "unknown";

		console.log("Transaction submitted successfully, ID:", txId);

		return txId;
	} catch (err) {
		console.error("Failed to submit transaction:", err);

		const msg =
			err instanceof Error ? err.message : "Failed to broadcast transaction.";

		throw new Error(`Broadcast Error: ${msg}`);
	}
};
