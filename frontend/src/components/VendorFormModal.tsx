import { useEffect, useMemo, useState } from 'react';
import Modal from './modal/Modal';
import type { Vendor } from '../types';
import type { VendorPayload } from '../hooks/useVendors';

type VendorFormModalProps = {
  isOpen: boolean;
  initialVendor?: Vendor | null;
  existingNormalizedNames: string[];
  isSaving?: boolean;
  onClose: () => void;
  onSubmit: (payload: VendorPayload) => void;
};

type FormState = {
  name: string;
  account_no: string;
  ifsc: string;
  bank_name: string;
  default_amount: string;
  remarks: string;
};

const emptyState: FormState = {
  name: '',
  account_no: '',
  ifsc: '',
  bank_name: '',
  default_amount: '',
  remarks: '',
};

const toPayload = (state: FormState): VendorPayload => ({
  name: state.name.trim(),
  account_no: state.account_no.trim() || undefined,
  ifsc: state.ifsc.trim() || undefined,
  bank_name: state.bank_name.trim() || undefined,
  default_amount: state.default_amount.trim() ? Number(state.default_amount) : 0,
  remarks: state.remarks.trim() || undefined,
});

const VendorFormModal = ({
  isOpen,
  initialVendor,
  existingNormalizedNames,
  isSaving,
  onClose,
  onSubmit,
}: VendorFormModalProps) => {
  const [form, setForm] = useState<FormState>(emptyState);

  useEffect(() => {
    if (!isOpen) return;

    if (initialVendor) {
      setForm({
        name: initialVendor.name ?? '',
        account_no: initialVendor.account_no ?? '',
        ifsc: initialVendor.ifsc ?? '',
        bank_name: initialVendor.bank_name ?? '',
        default_amount: String(initialVendor.default_amount ?? 0),
        remarks: initialVendor.remarks ?? '',
      });
      return;
    }

    setForm(emptyState);
  }, [initialVendor, isOpen]);

  const normalizedName = form.name.trim().toUpperCase();
  const hasDuplicate = useMemo(() => {
    if (!normalizedName) return false;
    const baseName = (initialVendor?.normalized_name ?? '').trim().toUpperCase();
    if (normalizedName === baseName) return false;
    return existingNormalizedNames.includes(normalizedName);
  }, [existingNormalizedNames, initialVendor?.normalized_name, normalizedName]);

  const canSubmit = form.name.trim().length > 0 && !hasDuplicate;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-800">{initialVendor ? 'Edit Vendor' : 'Add Vendor'}</h2>
      </div>

      <form
        className="space-y-3 px-6 py-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSubmit) return;
          onSubmit(toPayload(form));
        }}
      >
        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Name</span>
          <input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Vendor name"
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none ring-blue-200 focus:ring-2"
            required
          />
          {hasDuplicate && <p className="mt-1 text-xs text-red-600">Vendor already exists.</p>}
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Account No</span>
            <input
              value={form.account_no}
              onChange={(event) => setForm((prev) => ({ ...prev, account_no: event.target.value }))}
              placeholder="Account number"
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none ring-blue-200 focus:ring-2"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">IFSC</span>
            <input
              value={form.ifsc}
              onChange={(event) => setForm((prev) => ({ ...prev, ifsc: event.target.value }))}
              placeholder="IFSC"
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none ring-blue-200 focus:ring-2"
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Bank Name</span>
            <input
              value={form.bank_name}
              onChange={(event) => setForm((prev) => ({ ...prev, bank_name: event.target.value }))}
              placeholder="Bank name"
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none ring-blue-200 focus:ring-2"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Default Amount</span>
            <input
              value={form.default_amount}
              onChange={(event) => setForm((prev) => ({ ...prev, default_amount: event.target.value }))}
              placeholder="0"
              inputMode="decimal"
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none ring-blue-200 focus:ring-2"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Remarks</span>
          <textarea
            value={form.remarks}
            onChange={(event) => setForm((prev) => ({ ...prev, remarks: event.target.value }))}
            rows={3}
            placeholder="Remarks"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-blue-200 focus:ring-2"
          />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit || isSaving}
            className="rounded-lg bg-[#1F4E79] px-4 py-2 text-sm font-semibold text-white hover:bg-[#163a5c] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default VendorFormModal;
