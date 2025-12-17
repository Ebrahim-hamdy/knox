import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/AppShell";
import { CreateVaultWizard } from "@/components/vaults/CreateVaultWizard";
import { ImportProposal } from "@/components/dashboard/ImportProposal";
import { KnoxCard } from "@/components/ui/knox-card";
import { KnoxLoader } from "@/components/ui/knox-loader";
import { PendingProposals } from "@/components/dashboard/PendingProposals";
import { VaultCard } from "@/components/vaults/VaultCard";
import { useEffect } from "react";
import { useVaultStore } from "@/store/vault-store";
import { z } from "zod";

const searchSchema = z.object({
	view: z.enum(["list", "create"]).optional(),
	proposal: z.string().optional(),
});

function DashboardComponent() {
	// eslint-disable-next-line no-use-before-define
	const { view, proposal } = Route.useSearch();
	const { vaults } = useVaultStore();

	const navigate = useNavigate();

	useEffect(() => {
		if (proposal) {
			void navigate({
				to: "/proposal",
				search: { proposal },
				replace: true,
			});
		}
	}, [proposal, navigate]);

	if (proposal) {
		return (
			<AppShell>
				<KnoxLoader className="mx-auto h-12 w-12" />
				<p className="text-center font-mono uppercase">Loading Proposal...</p>
			</AppShell>
		);
	}

	if (view === "create") {
		return (
			<AppShell>
				<CreateVaultWizard />
			</AppShell>
		);
	}

	return (
		<AppShell>
			<div className="mb-8 flex items-center justify-between">
				<h2 className="text-4xl font-black uppercase tracking-tight">
					My Vaults
				</h2>
				<Link
					className="no-underline"
					search={{ view: "create" }}
					to="/dashboard"
				>
					<KnoxCard
						asButton
						className="px-6 py-3 font-bold uppercase tracking-wide text-white shadow-[4px_4px_0px_0px_#000000]"
						variant="active"
					>
						+ New Vault
					</KnoxCard>
				</Link>
			</div>
			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				{vaults.length === 0 ? (
					<KnoxCard className="col-span-full flex min-h-[300px] flex-col items-center justify-center gap-6 bg-[var(--color-background)] text-center">
						<div className="h-16 w-16 border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_#000000]"></div>
						<p className="max-w-xs font-mono text-sm uppercase text-[var(--color-border)] opacity-70">
							No active vaults found. Create a new secure configuration to get
							started.
						</p>
					</KnoxCard>
				) : (
					vaults.map((vault) => <VaultCard key={vault.id} vault={vault} />)
				)}
			</div>
			{vaults.length > 0 && (
				<>
					<PendingProposals />
					<div className="mt-12">
						<ImportProposal />
					</div>
				</>
			)}
		</AppShell>
	);
}

export const Route = createFileRoute("/dashboard")({
	validateSearch: (search) => searchSchema.parse(search),
	component: DashboardComponent,
});
