import { Hourglass, Share2 } from "lucide-react";

import { KnoxCard } from "../ui/knox-card";
import { Link } from "@tanstack/react-router";
import { db } from "@/lib/storage";
import { encodeNpst } from "@/lib/npst-engine";
import { nicksToNock } from "@/lib/nockchain/asset-utils";
import { useLiveQuery } from "dexie-react-hooks";
import { useVaultStore } from "@/store/vault-store";

export function PendingProposals() {
  const { vaults } = useVaultStore();
  const pendingProposals = useLiveQuery(
    () => db.pendingProposals.toArray(),
    [],
  );

  if (!pendingProposals || pendingProposals.length === 0) {
    return null;
  }

  return (
    <div className="mt-12">
      <h3 className="mb-4 text-2xl font-black uppercase">Pending Proposals</h3>
      <div className="grid gap-6 md:grid-cols-2">
        {pendingProposals.map((p: (typeof pendingProposals)[number]) => {
          const vault = vaults.find((v) => v.id === p.vaultId);

          if (!vault) {
            return null;
          }

          const amount = nicksToNock(
            BigInt(p.proposal.context.amountToSendNicks),
          );

          const numSigs = p.proposal.signatures.length;
          const requiredSigs = vault.threshold;
          const shareLink = `/proposal?proposal=${encodeNpst(p.proposal)}`;

          return (
            <KnoxCard key={p.id} className="bg-white p-0">
              <div className="p-4">
                <p className="font-mono text-xs uppercase text-gray-500">
                  {vault.name}
                </p>
                <p className="font-bold">
                  Send {amount.toFixed(4)} NOCK to{" "}
                  <span className="truncate font-mono text-sm">
                    {p.proposal.context.recipientAddress}
                  </span>
                </p>
              </div>
              <div className="flex items-center justify-between border-t-[3px] border-black bg-gray-100 p-4">
                <div className="flex items-center gap-2 font-mono text-sm">
                  <Hourglass className="h-4 w-4" />
                  <span>
                    {numSigs} / {requiredSigs} Signatures
                  </span>
                </div>
                <Link className="no-underline" to={shareLink}>
                  <KnoxCard
                    asButton
                    className="flex items-center gap-2 px-3 py-2 text-xs"
                    variant="active"
                  >
                    <Share2 className="h-4 w-4" />
                    Resume
                  </KnoxCard>
                </Link>
              </div>
            </KnoxCard>
          );
        })}
      </div>
    </div>
  );
}
