"use client";

import * as Dialog from "@radix-ui/react-dialog";

type Props = {
  open: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
};

export default function ConfirmDialog({
  open,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger = false,
  onOpenChange,
  onConfirm,
}: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(6px)",
            zIndex: 9998,
          }}
        />
        <Dialog.Content
          style={{
            position: "fixed",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: "min(92vw, 420px)",
            borderRadius: 18,
            background: "white",
            padding: 16,
            border: "1px solid rgba(0,0,0,0.10)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
            zIndex: 9999,
          }}
        >
          <Dialog.Title style={{ fontWeight: 950, fontSize: 16, marginBottom: 6 }}>
            {title}
          </Dialog.Title>

          <Dialog.Description style={{ opacity: 0.75, fontWeight: 700, fontSize: 13 }}>
            {description}
          </Dialog.Description>

          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <Dialog.Close asChild>
              <button
                type="button"
                className="btn btn-gray"
                style={{ flex: 1 }}
              >
                {cancelText}
              </button>
            </Dialog.Close>

            <button
              type="button"
              className={danger ? "btn btn-warm" : "btn btn-warm"}
              style={{
                flex: 1,
                filter: danger ? "saturate(1.1)" : "none",
              }}
              onClick={onConfirm}
            >
              {confirmText}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
