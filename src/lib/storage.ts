import Dexie, { type Table } from "dexie";
import type { decryptData, encryptData } from "./crypto";
import type { NPST } from "@/types/npst";

interface EncryptedBlob {
	iv: Array<number>;
	data: Array<number>;
}

export interface EncryptedRecord {
	id: string;
	blob: EncryptedBlob;
	updatedAt: number;
}

export interface TransactionRecord {
	txId: string;
	vaultId: string;
	timestamp: number;
	contextJson: string;
}

export interface PendingProposalRecord {
	id: string;
	vaultId: string;
	proposal: NPST;
	createdAt: number;
}

class KnoxDatabase extends Dexie {
	encryptedStore!: Table<EncryptedRecord, string>;
	transactionHistory!: Table<TransactionRecord, string>;
	pendingProposals!: Table<PendingProposalRecord, string>;

	constructor() {
		super("KnoxDB");

		this.version(2).stores({
			encryptedStore: "id",
			transactionHistory: "txId, vaultId",
			pendingProposals: "id, vaultId",
		});

		this.version(1).stores({
			encryptedStore: "id",
		});
	}
}

export const db = new KnoxDatabase();

export const hasEncryptedVaults = async (): Promise<boolean> => {
	const count = await db.encryptedStore.count();

	return count > 0;
};

export const saveEncryptedRecord = async (
	id: string,
	data: unknown,
	key: CryptoKey,
	encryptFn: typeof encryptData
): Promise<void> => {
	const blob = await encryptFn(data, key);

	await db.encryptedStore.put({
		id,
		blob,
		updatedAt: Date.now(),
	});
};

export class DecryptionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "DecryptionError";
	}
}

export const loadAllDecrypted = async <T>(
	key: CryptoKey,
	decryptFn: typeof decryptData
): Promise<Array<T>> => {
	const records = await db.encryptedStore.toArray();

	if (records.length === 0) {
		return [];
	}

	const decryptionPromises = records.map((record) =>
		decryptFn(record.blob, key)
	);

	const settledResults = await Promise.allSettled(decryptionPromises);

	const results: Array<T> = [];
	const errors: Array<{ id: string; error: unknown }> = [];

	settledResults.forEach((result, index) => {
		if (result.status === "fulfilled") {
			results.push(result.value as T);
		} else {
			errors.push({ id: records[index].id, error: result.reason });
		}
	});

	if (records.length > 0 && results.length === 0) {
		throw new DecryptionError("Decryption failed. Incorrect Wallet Signature.");
	}

	if (errors.length > 0) {
		console.warn(
			"Recovered partial vault data. Some records were corrupted:",
			errors
		);
	}

	return results;
};

export const saveTransactionRecord = async (
	record: TransactionRecord
): Promise<void> => {
	await db.transactionHistory.put(record);
};

export const loadTransactionHistory = async (
	vaultId: string
): Promise<Array<TransactionRecord>> => {
	return db.transactionHistory.where({ vaultId }).toArray();
};

export const savePendingProposal = async (
	record: PendingProposalRecord
): Promise<void> => {
	await db.pendingProposals.put(record);
};

export const loadPendingProposalsByVault = async (
	vaultId: string
): Promise<Array<PendingProposalRecord>> => {
	return db.pendingProposals.where({ vaultId }).toArray();
};

export const deletePendingProposal = async (id: string): Promise<void> => {
	await db.pendingProposals.delete(id);
};
