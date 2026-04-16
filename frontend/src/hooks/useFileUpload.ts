import { useState, useCallback } from 'react';

export type ReceiptFile = {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "processing" | "extracted" | "reviewed" | "approved" | "rejected" | "error";
  isDuplicate: boolean;
  isValid: boolean;
  hash: string;
};

export const useFileUpload = () => {
  const [files, setFiles] = useState<ReceiptFile[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [stats, setStats] = useState({
    total: 0,
    valid: 0,
    duplicates: 0,
    invalid: 0
  });
  const [feedback, setFeedback] = useState<string[]>([]);

  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/bmp'];

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const newFilesArray = Array.from(fileList);
    if (newFilesArray.length === 0) return;

    let addedCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;
    let newValidCount = 0;
    
    const messages: string[] = [];
    const newReceipts: ReceiptFile[] = [];

    setFiles(prevFiles => {
      const existingHashes = new Set(prevFiles.map(f => f.hash));

      for (const file of newFilesArray) {
        const hash = file.name + "_" + file.size;
        const isValid = allowedTypes.includes(file.type);
        const isDuplicate = existingHashes.has(hash);

        if (!isValid) {
          invalidCount++;
          continue; // Skip adding to active list
        }

        if (isDuplicate) {
          duplicateCount++;
          continue; // DO NOT add to active list
        }

        newValidCount++;
        addedCount++;
        existingHashes.add(hash);
        
        newReceipts.push({
          id: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
          status: "pending",
          isDuplicate: false, 
          isValid: true, 
          hash
        });
      }

      const updatedFiles = [...prevFiles, ...newReceipts];
      
      // Update active index to the first newly added valid file if available
      if (newReceipts.length > 0 && prevFiles.length === 0) {
        setActiveIndex(0);
      } else if (newReceipts.length > 0) {
        setActiveIndex(prevFiles.length);
      }

      if (addedCount > 0) messages.push(`${addedCount} files added to batch`);
      if (duplicateCount > 0) messages.push(`${duplicateCount} duplicate files skipped`);
      if (newValidCount === 0 && newFilesArray.length > 0) messages.push(`No valid images selected`);
      
      setFeedback(messages);
      
      return updatedFiles;
    });

    setStats(prev => ({
      total: prev.total + newFilesArray.length,
      valid: prev.valid + newValidCount,
      duplicates: prev.duplicates + duplicateCount,
      invalid: prev.invalid + invalidCount
    }));

  }, [allowedTypes]);

  const markFilesApproved = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const approvedIds = new Set(ids);
    setFiles(prev => prev.map(file => (
      approvedIds.has(file.id)
        ? { ...file, status: 'approved' as const }
        : file
    )));
  }, []);

  const removeFiles = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);

    setFiles(prev => {
      const next = prev.filter(file => !idSet.has(file.id));
      setActiveIndex(current => {
        if (next.length === 0) return 0;
        if (current >= next.length) return next.length - 1;
        return current;
      });
      return next;
    });
  }, []);

  const removeImage = useCallback((id: string) => {
    setFiles(prev => prev.map(file => {
      if (file.id !== id) return file;
      if (!file.preview) return file;
      return {
        ...file,
        preview: '',
      };
    }));
  }, []);

  return {
    files,
    setFiles,
    activeIndex,
    setActiveIndex,
    stats,
    addFiles,
    feedback,
    setFeedback,
    markFilesApproved,
    removeFiles,
    removeImage,
  };
};
