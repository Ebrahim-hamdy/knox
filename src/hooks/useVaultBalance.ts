import { getVaultBalance } from "@/lib/nockchain/asset-utils";
import { useQuery } from "@tanstack/react-query";
import { useWalletStore } from "@/store/wallet-store";

export const useVaultBalance = (address: string | undefined) => {
	const { grpcClient } = useWalletStore();

	return useQuery({
		queryKey: ["vaultBalance", address],
		queryFn: () => {
			if (!grpcClient || !address) {
				throw new Error("Client not ready or address not provided.");
			}
			return getVaultBalance(grpcClient, address);
		},
		enabled: !!address && !!grpcClient,
		refetchInterval: 60 * 1000,
	});
};
