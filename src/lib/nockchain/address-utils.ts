import bs58 from "bs58";
import { wasm } from "@nockbox/iris-sdk";

const EXPECTED_DECODED_SIMPLE_PK_LENGTH = 40;
const EXPECTED_WASM_EXTENDED_PK_LENGTH = 97;

/**
 * Converts a Base58-encoded public key string from an Iris wallet
 * to its corresponding Public Key Hash (PKH) address.
 */
export function pkStringToPkh(publicKeyString: string): string {
	let decodedSimpleKey: Uint8Array;
	try {
		decodedSimpleKey = bs58.decode(publicKeyString);
	} catch (error) {
		console.error(
			`Failed to decode Base58 public key string: "${publicKeyString}"`,
			error
		);

		throw new Error("Invalid Base58 format or checksum.");
	}

	// 2. Validate the decoded length of the simple key.
	if (decodedSimpleKey.length !== EXPECTED_DECODED_SIMPLE_PK_LENGTH) {
		throw new Error(
			`Decoded public key has an invalid length. Expected ${EXPECTED_DECODED_SIMPLE_PK_LENGTH} bytes, but got ${decodedSimpleKey.length}.`
		);
	}

	const RAW_KEY_OFFSET = 4;
	const RAW_KEY_LENGTH = 32;
	const rawKeyBytes = decodedSimpleKey.slice(
		RAW_KEY_OFFSET,
		RAW_KEY_OFFSET + RAW_KEY_LENGTH
	);

	const extendedKeyBytes = new Uint8Array(EXPECTED_WASM_EXTENDED_PK_LENGTH);

	extendedKeyBytes.set(rawKeyBytes, 0);

	try {
		const pkhAddress = wasm.hashPublicKey(extendedKeyBytes);

		return pkhAddress;
	} catch (error) {
		console.error(
			`WASM failed to hash the constructed extended public key for input: "${publicKeyString}"`,
			error
		);

		throw new Error("WASM error during public key hashing.");
	}
}

export function isValidPublicKeyString(pkString: string): boolean {
	if (typeof pkString !== "string" || pkString.length === 0) {
		return false;
	}
	try {
		const decoded = bs58.decode(pkString);

		return decoded.length === EXPECTED_DECODED_SIMPLE_PK_LENGTH;
	} catch {
		return false;
	}
}

export function isValidPkh(pkhAddress: string): boolean {
	if (typeof pkhAddress !== "string" || pkhAddress.length === 0) {
		return false;
	}

	try {
		const digest = new wasm.Digest(pkhAddress);

		digest.free();

		return true;
	} catch {
		return false;
	}
}
