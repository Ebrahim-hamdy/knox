import { Outlet, createRootRoute } from "@tanstack/react-router";

import { ErrorBoundary } from "react-error-boundary";
import { GlobalErrorBoundary } from "@/components/layout/ErrorBoundary";
import { initWasm } from "@/lib/nockchain/wasm-loader";
import { useEffect } from "react";

function RootComponent() {
	useEffect(() => {
		void initWasm();
	}, []);

	return (
		<>
			<ErrorBoundary FallbackComponent={GlobalErrorBoundary}>
				<div className="min-h-screen bg-background font-sans text-border">
					<Outlet />
				</div>
			</ErrorBoundary>
		</>
	);
}

export const Route = createRootRoute({
	component: RootComponent,
});
