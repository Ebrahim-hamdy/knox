import { useEffect, useState } from "react";

import { InitializeSystem } from "@/components/onboarding/InitializeSystem";
import { KnoxCard } from "@/components/ui/knox-card";
import { KnoxLoader } from "@/components/ui/knox-loader";
import { Link } from "@tanstack/react-router";
import { LoginModal } from "@/components/auth/LoginModal";
import { hasEncryptedVaults } from "@/lib/storage";
import { useAuthStore } from "@/store/auth-store";

interface AppShellProps {
	children: React.ReactNode;
}

type SystemStatus = "checking" | "has_data" | "new_user";

export function AppShell({ children }: AppShellProps) {
	const { isAuthenticated, walletAddress } = useAuthStore();
	const [status, setStatus] = useState<SystemStatus>("checking");

	useEffect(() => {
		let mounted = true;
		const checkStorage = async () => {
			try {
				const exists = await hasEncryptedVaults();

				if (mounted) {
					setStatus(exists ? "has_data" : "new_user");
				}
			} catch (e) {
				console.error("Failed to check for encrypted vaults:", e);

				setStatus("new_user");
			}
		};

		if (!isAuthenticated) {
			void checkStorage();
		}

		return () => {
			mounted = false;
		};
	}, [isAuthenticated]);

	if (!isAuthenticated && status === "checking") {
		return (
			<div className="flex h-screen items-center justify-center bg-[var(--color-background)]">
				<KnoxLoader className="h-12 w-12 text-black" />
			</div>
		);
	}

	if (!isAuthenticated && status === "new_user") {
		return <InitializeSystem />;
	}

	return (
		<>
			<LoginModal />

			<div className="flex min-h-screen flex-col bg-[var(--color-background)] md:flex-row">
				<aside className="z-20 w-full border-b-[3px] border-black bg-white md:sticky md:top-0 md:h-screen md:w-64 md:border-b-0 md:border-r-[3px]">
					<div className="border-b-[3px] border-black p-6">
						<h1 className="text-3xl font-black uppercase tracking-tight">
							Knox
						</h1>
						{walletAddress && (
							<div className="mt-3 border-[2px] border-black bg-[var(--color-background)] p-2">
								<p className="text-[10px] font-bold uppercase text-gray-500">
									Session Active
								</p>
								<p className="truncate font-mono text-xs font-bold">
									{walletAddress}
								</p>
							</div>
						)}
					</div>

					<nav className="flex flex-col gap-3 p-4">
						<Link to="/dashboard">
							{({ isActive }) => (
								<KnoxCard
									asButton
									className={`w-full py-3 text-center text-sm font-bold uppercase ${isActive ? "bg-black text-white shadow-none translate-x-[2px] translate-y-[2px]" : ""}`}
								>
									Dashboard
								</KnoxCard>
							)}
						</Link>
						<button
							className="mt-8 w-full border-[3px] border-black p-2 text-xs font-bold uppercase hover:bg-red-500 hover:text-white"
							onClick={() => {
								window.location.reload();
							}}
						>
							Lock System
						</button>
					</nav>
				</aside>

				<main className="flex-1 overflow-y-auto bg-[var(--color-background)] p-4 md:p-8">
					<div className="mx-auto max-w-5xl space-y-8">{children}</div>
				</main>
			</div>
		</>
	);
}
