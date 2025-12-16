import { wasm } from "@nockbox/iris-sdk";

let isInitialized = false;

export const initWasm = async () => {
  if (isInitialized) {
    return;
  }

  isInitialized = true;

  try {
    const wasmPath = "/wasm/iris_wasm_bg.wasm";
    // eslint-disable-next-line camelcase
    await wasm.default({ module_or_path: wasmPath });

    console.log("✅ Nockchain WASM Initialized");
  } catch (error) {
    console.error("❌ Failed to initialize WASM:", error);

    throw new Error("Could not load Nockchain core logic.");
  }
};

export const ensureWasmLoaded = async (): Promise<void> => {
  if (!isInitialized) {
    await initWasm();
  }
};
