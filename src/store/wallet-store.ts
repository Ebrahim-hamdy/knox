import { NockchainProvider, wasm } from "@nockbox/iris-sdk";

import { create } from "zustand";
import { ensureWasmLoaded } from "@/lib/nockchain/wasm-loader";
import { pkStringToPkh } from "@/lib/nockchain/address-utils";

const DEFAULT_GRPC_ENDPOINT = "https://testnet.nockchain.net:9090";

export interface WalletState {
	isConnecting: boolean;
	isConnected: boolean;
	walletPkh: string | null;
	walletAddress: string | null;
	grpcEndpoint: string | null;
	provider: NockchainProvider | null;
	grpcClient: wasm.GrpcClient | null;
	error: string | null;

	connect: () => Promise<void>;
	disconnect: () => void;
	signMessage: (message: string) => Promise<string>;
}

interface ConnectResponse {
	pkh: string;
	grpcEndpoint: string;
}

export const useWalletStore = create<WalletState>((set, get) => ({
	isConnecting: false,
	isConnected: false,
	walletPkh: null,
	walletAddress: null,
	grpcEndpoint: null,
	provider: null,
	grpcClient: null,
	error: null,

	connect: async (): Promise<void> => {
		if (get().isConnected) {
			return;
		}

		set({ isConnecting: true, error: null });

		try {
			await ensureWasmLoaded();

			const provider = new NockchainProvider();
			const info = (await provider.connect()) as ConnectResponse;

			if (!info || !info.pkh) {
				throw new Error("Wallet returned invalid connection data.");
			}

			let friendlyAddress = info.pkh;

			try {
				friendlyAddress = pkStringToPkh(info.pkh);
			} catch (e) {
				console.warn("Failed to derive friendly address, using raw PKH", e);
			}

			const endpoint = info.grpcEndpoint || DEFAULT_GRPC_ENDPOINT;
			const grpcClient = new wasm.GrpcClient(info.grpcEndpoint);

			set({
				isConnected: true,
				isConnecting: false,
				walletPkh: info.pkh,
				walletAddress: friendlyAddress,
				grpcEndpoint: endpoint,
				provider,
				grpcClient,
			});
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Connection failed";

			set({ isConnecting: false, error: msg, isConnected: false });

			throw new Error(msg);
		}
	},

	disconnect: (): void => {
		set({
			isConnected: false,
			walletPkh: null,
			walletAddress: null,
			provider: null,
			grpcClient: null,
		});
	},

	signMessage: async (message: string): Promise<string> => {
		const { provider } = get();

		if (!provider) {
			throw new Error("Wallet not connected or provider not available.");
		}

		try {
			const response = await provider.signMessage(message);

			return response.signature;
		} catch (error: unknown) {
			let errorMessage = "An unknown signing error occurred.";

			if (error instanceof Error) {
				if (error.message.includes("[object Object]")) {
					errorMessage = "Request rejected by user.";
				} else {
					errorMessage = error.message;
				}
			} else if (typeof error === "string") {
				errorMessage = error;
			}

			throw new Error(errorMessage);
		}
	},
}));
