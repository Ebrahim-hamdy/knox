import { wasm } from "@nockbox/iris-sdk";

// 1 NOCK = 65536 nicks.
const NICKS_PER_NOCK = 65536n;

export interface DisplayNote {
	amount: bigint;
	amountAsNock: number;
	firstName: string;
	lastName: string;
	rawNote: wasm.Note;
}

export const nicksToNock = (nicks: bigint): number => {
	return Number(nicks) / Number(NICKS_PER_NOCK);
};

export const getVaultBalance = async (
	grpcClient: wasm.GrpcClient,
	address: string
): Promise<Array<DisplayNote>> => {
	if (!grpcClient) {
		throw new Error("gRPC client is not initialized.");
	}

	try {
		const balanceResponse = await grpcClient.getBalanceByFirstName(address);

		if (!balanceResponse?.notes || balanceResponse.notes.length === 0) {
			return [];
		}

		const parsedNotes: Array<DisplayNote> = [];

		for (const noteEntry of balanceResponse.notes) {
			try {
				const rawNote = wasm.Note.fromProtobuf(noteEntry.note);

				parsedNotes.push({
					amount: rawNote.assets,
					amountAsNock: nicksToNock(rawNote.assets),
					firstName: rawNote.name?.first || "Unknown",
					lastName: rawNote.name?.last || "Unknown",
					rawNote,
				});
			} catch (e) {
				console.warn("Could not parse a note from balance response:", e);
				//Skip malformed notes.
			}
		}

		return parsedNotes;
	} catch (error) {
		console.error("Failed to fetch vault balance:", error);

		const message =
			error instanceof Error ? error.message : "Failed to fetch balance.";

		throw new Error(message);
	}
};

export const calculateTotalBalance = (notes: Array<DisplayNote>): number => {
	if (!notes || notes.length === 0) {
		return 0;
	}

	const totalNicks = notes.reduce(
		(total, note) => total + note.amount,
		BigInt(0)
	);

	return nicksToNock(totalNicks);
};
