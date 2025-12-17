import { AlertTriangle } from "lucide-react";
import type { FallbackProps } from "react-error-boundary";
import { KnoxCard } from "../ui/knox-card";

export function GlobalErrorBoundary({ error }: FallbackProps) {
	return (
		<div
			className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-4"
			role="alert"
		>
			<KnoxCard className="w-full max-w-lg" variant="danger">
				<div className="flex items-start gap-4">
					<AlertTriangle className="h-8 w-8 shrink-0" />
					<div>
						<h2 className="text-2xl font-black uppercase">Application Error</h2>
						<p className="mt-2 font-mono text-sm">
							An unexpected error occurred. Please refresh the page to reset the
							application state.
						</p>
						<KnoxCard
							asButton
							className="mt-6 w-full bg-white text-center font-bold uppercase text-black"
							onClick={() => {
								window.location.reload();
							}}
						>
							Refresh Page
						</KnoxCard>
						<details className="mt-4">
							<summary className="cursor-pointer font-mono text-xs uppercase">
								Error Details
							</summary>
							<pre className="mt-2 whitespace-pre-wrap rounded-none border-2 border-black bg-gray-100 p-2 font-mono text-xs">
								{error.message}
							</pre>
						</details>
					</div>
				</div>
			</KnoxCard>
		</div>
	);
}
