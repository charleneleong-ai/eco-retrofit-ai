export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the Data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const formatCurrency = (value: number, currency: string = '$') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === '$' ? 'USD' : currency, // Simple mapping, could be expanded
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};
