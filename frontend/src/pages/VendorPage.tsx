import { useMemo, useState } from 'react';
import VendorTable from '../components/VendorTable';
import VendorFormModal from '../components/VendorFormModal';
import { useCreateVendor, useDeleteVendor, useUpdateVendor, useVendors } from '../hooks/useVendors';
import type { Vendor } from '../types';
import { useModal } from '../components/modal/useModal';
import { useToast } from '../hooks/useToast';

const VendorPage = () => {
  const { data: vendors = [], isLoading } = useVendors();
  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();
  const deleteVendor = useDeleteVendor();
  const { openConfirm } = useModal();
  const { addToast } = useToast();

  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  const filteredVendors = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return vendors;
    return vendors.filter((vendor) => vendor.name.toLowerCase().includes(needle));
  }, [search, vendors]);

  const existingNormalizedNames = useMemo(
    () => vendors.map((vendor) => vendor.normalized_name),
    [vendors],
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Vendor Management</h1>
        <button
          type="button"
          onClick={() => {
            setEditingVendor(null);
            setIsFormOpen(true);
          }}
          className="rounded-lg bg-[#1F4E79] px-4 py-2 text-sm font-semibold text-white hover:bg-[#163a5c]"
        >
          Add Vendor
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">Loading vendors...</div>
      ) : (
        <div className="min-h-0 flex-1">
          <VendorTable
            vendors={filteredVendors}
            search={search}
            onSearchChange={setSearch}
            onEdit={(vendor) => {
              setEditingVendor(vendor);
              setIsFormOpen(true);
            }}
            onDelete={(vendor) => {
              openConfirm({
                title: 'Delete vendor?',
                message: `Delete ${vendor.name}? This cannot be undone.`,
                confirmText: 'Delete',
                cancelText: 'Cancel',
                onConfirm: () => {
                  deleteVendor.mutate(vendor.id, {
                    onSuccess: () => addToast('Vendor deleted', 'success'),
                    onError: () => addToast('Failed to delete vendor', 'error'),
                  });
                },
              });
            }}
          />
        </div>
      )}

      <VendorFormModal
        isOpen={isFormOpen}
        initialVendor={editingVendor}
        existingNormalizedNames={existingNormalizedNames}
        isSaving={createVendor.isPending || updateVendor.isPending}
        onClose={() => {
          setIsFormOpen(false);
          setEditingVendor(null);
        }}
        onSubmit={(payload) => {
          if (editingVendor) {
            updateVendor.mutate(
              { id: editingVendor.id, payload },
              {
                onSuccess: () => {
                  setIsFormOpen(false);
                  setEditingVendor(null);
                  addToast('Vendor updated', 'success');
                },
                onError: () => addToast('Failed to update vendor', 'error'),
              },
            );
            return;
          }

          createVendor.mutate(payload, {
            onSuccess: () => {
              setIsFormOpen(false);
              addToast('Vendor created', 'success');
            },
            onError: () => addToast('Failed to create vendor', 'error'),
          });
        }}
      />
    </div>
  );
};

export default VendorPage;
