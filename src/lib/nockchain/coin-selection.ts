import type { DisplayNote } from "./asset-utils";

export interface CoinSelectionResult {
	selectedNotes: Array<DisplayNote>;
	changeAmount: bigint;
	totalSelectedAmount: bigint;
}

export class InsufficientFundsError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "InsufficientFundsError";
	}
}

export const selectNotesForTransaction = (
	availableNotes: Array<DisplayNote>,
	amountToSend: bigint,
	fee: bigint
): CoinSelectionResult => {
	const targetAmount = amountToSend + fee;

	const totalAvailable = availableNotes.reduce(
		(sum, note) => sum + note.amount,
		BigInt(0)
	);

	if (totalAvailable < targetAmount) {
		throw new InsufficientFundsError(
			"Insufficient funds to cover the amount and fee."
		);
	}

	// Sort notes from largest to smallest to use the fewest notes possible.
	const sortedNotes = [...availableNotes].sort((a, b) =>
		b.amount > a.amount ? 1 : -1
	);

	const selectedNotes: Array<DisplayNote> = [];
	let totalSelectedAmount = BigInt(0);

	for (const note of sortedNotes) {
		if (totalSelectedAmount >= targetAmount) {
			break;
		}
		selectedNotes.push(note);
		totalSelectedAmount += note.amount;
	}

	if (totalSelectedAmount < targetAmount) {
		throw new InsufficientFundsError(
			"Could not find a valid combination of notes."
		);
	}

	const changeAmount = totalSelectedAmount - targetAmount;

	return { selectedNotes, changeAmount, totalSelectedAmount };
};
