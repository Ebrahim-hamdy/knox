import { KnoxCard } from "../ui/knox-card";
import { QrReader } from "react-qr-reader";

interface QrScannerModalProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export function QrScannerModal({ onScan, onClose }: QrScannerModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <KnoxCard className="w-full max-w-md bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-bold uppercase">Scan Proposal QR Code</h3>
          <button className="text-2xl font-black" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="overflow-hidden border-[3px] border-black">
          <QrReader
            constraints={{ facingMode: "environment" }}
            containerStyle={{ width: "100%" }}
            onResult={(result, error) => {
              if (result) {
                onScan(result.getText());
              }

              if (error) {
                console.info(error);
              }
            }}
          />
        </div>
        <p className="mt-4 text-center font-mono text-xs text-gray-500">
          Point your camera at the QR code displayed on the other device.
        </p>
      </KnoxCard>
    </div>
  );
}
