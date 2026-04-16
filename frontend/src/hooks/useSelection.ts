import { useMemo, useState } from 'react';

export const useSelection = (allIds: string[]) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => (
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    ));
  };

  const selectAll = () => {
    setSelectedIds(prev => (prev.length === allIds.length ? [] : [...allIds]));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const isSelected = (id: string) => selectedSet.has(id);
  const isAllSelected = allIds.length > 0 && selectedIds.length === allIds.length;

  return {
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    isSelected,
    isAllSelected,
  };
};
