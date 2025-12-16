import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { createRequire } from "node:module";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { normalizePath } from "vite";
import path from "node:path";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

const require = createRequire(import.meta.url);

let wasmSourcePath;
try {
	const wasmJsPath = require.resolve("@nockbox/iris-wasm/iris_wasm.js");

	wasmSourcePath = path.join(path.dirname(wasmJsPath), "iris_wasm_bg.wasm");
} catch (e) {
	console.warn(
		"Could not resolve @nockbox/iris-wasm via require, falling back to node_modules assumption"
	);

	wasmSourcePath = path.resolve(
		__dirname,
		"node_modules/@nockbox/iris-wasm/iris_wasm_bg.wasm"
	);
}

export default defineConfig({
	plugins: [
		react(),
		tailwindcss(),
		TanStackRouterVite(),
		viteStaticCopy({
			targets: [
				{
					src: normalizePath(wasmSourcePath),
					dest: "wasm",
				},
			],
		}),
		nodePolyfills({
			include: ["buffer"],
		}),
	],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	server: {
		host: true,
		strictPort: true,
	},
});
