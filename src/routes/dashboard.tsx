import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/AppShell";
import { KnoxCard } from "@/components/ui/knox-card";
import { KnoxLoader } from "@/components/ui/knox-loader";
import { useEffect } from "react";
import { z } from "zod";

const searchSchema = z.object({
	view: z.enum(["list", "create"]).optional(),
	proposal: z.string().optional(),
});

function DashboardComponent() {
	// eslint-disable-next-line no-use-before-define
	const { proposal } = Route.useSearch();
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
		</AppShell>
	);
}

export const Route = createFileRoute("/dashboard")({
	validateSearch: (search) => searchSchema.parse(search),
	component: DashboardComponent,
});
