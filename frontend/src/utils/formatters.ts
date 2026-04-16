export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount == null) return "0.00";
  return amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "N/A";
  const [year, month, day] = dateString.split("-");
  return `${day}-${month}-${year}`;
};
