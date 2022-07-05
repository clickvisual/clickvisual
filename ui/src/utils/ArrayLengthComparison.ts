export const ArrayLengthComparison = (arr1: any[], arr2: any[]) => {
  if (arr1.length === 0 && arr2.length === 0) {
    return { same: true };
  }
  if (arr1.length > arr2.length) {
    return {
      max: arr1,
      min: arr2,
      same: false,
    };
  }
  if (arr1.length < arr2.length) {
    return {
      max: arr2,
      min: arr1,
      same: false,
    };
  }
  return null;
};
