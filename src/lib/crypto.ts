export const deriveKeyFromSignature = async (
	signature: string
): Promise<CryptoKey> => {
	const enc = new TextEncoder();
	const sigBuffer = enc.encode(signature);

	const keyMaterial = await window.crypto.subtle.importKey(
		"raw",
		sigBuffer,
		{ name: "PBKDF2" },
		false,
		["deriveKey"]
	);

	const salt = enc.encode("knox-multisig-vault-v1-salt");

	return window.crypto.subtle.deriveKey(
		{
			name: "PBKDF2",
			salt: salt,
			iterations: 100000,
			hash: "SHA-256",
		},
		keyMaterial,
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt", "decrypt"]
	);
};

export const encryptData = async (data: unknown, key: CryptoKey) => {
	const enc = new TextEncoder();
	const encodedData = enc.encode(JSON.stringify(data));

	const iv = window.crypto.getRandomValues(new Uint8Array(12));

	const encryptedBuffer = await window.crypto.subtle.encrypt(
		{ name: "AES-GCM", iv: iv },
		key,
		encodedData
	);

	return {
		iv: Array.from(iv),
		data: Array.from(new Uint8Array(encryptedBuffer)),
	};
};

export const decryptData = async <T = unknown>(
	encryptedData: { iv: Array<number>; data: Array<number> },
	key: CryptoKey
): Promise<T> => {
	const iv = new Uint8Array(encryptedData.iv);
	const data = new Uint8Array(encryptedData.data);

	try {
		const decryptedBuffer = await window.crypto.subtle.decrypt(
			{ name: "AES-GCM", iv: iv },
			key,
			data
		);

		const dec = new TextDecoder();
		const jsonString = dec.decode(decryptedBuffer);

		return JSON.parse(jsonString) as T;
	} catch (e) {
		console.error("Decryption failed", e);

		throw new Error("Failed to decrypt data. Invalid key or corrupted data.");
	}
};

export const generateSalt = (): Uint8Array => {
	return window.crypto.getRandomValues(new Uint8Array(16));
};
