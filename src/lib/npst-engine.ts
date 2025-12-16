import { Base64 } from "js-base64";
import type { NPST } from "@/types/npst";
import pako from "pako";

function jsonReplacer(key: string, value: unknown): unknown {
	if (value instanceof Uint8Array) {
		return Array.from(value);
	}

	return value;
}

export const encodeNpst = (npst: NPST): string => {
	const jsonString = JSON.stringify(npst, jsonReplacer);
	const compressed = pako.deflate(jsonString);

	return Base64.fromUint8Array(compressed, true);
};

export const decodeNpst = (encodedString: string): NPST => {
	try {
		const compressed = Base64.toUint8Array(encodedString);

		const jsonString = pako.inflate(compressed, { to: "string" });

		const parsed = JSON.parse(jsonString);

		if (!parsed.rawTxProto || !parsed.context) {
			throw new Error("Decoded object is missing required NPST fields.");
		}

		const npst: NPST = {
			...parsed,
			rawTxProto: new Uint8Array(parsed.rawTxProto),
		};

		return npst;
	} catch (error) {
		console.error("Failed to decode NPST string:", error);

		throw new Error("Invalid or corrupt proposal data provided.");
	}
};
