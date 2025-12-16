import { Outlet, createRootRoute } from "@tanstack/react-router";

import { initWasm } from "@/lib/nockchain/wasm-loader";
import { useEffect } from "react";

function RootComponent() {
	useEffect(() => {
		void initWasm();
	}, []);

	return (
		<>
			<div className="min-h-screen bg-background font-sans text-border">
				<Outlet />
			</div>
		</>
	);
}

export const Route = createRootRoute({
	component: RootComponent,
});
