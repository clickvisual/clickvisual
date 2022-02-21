export const parseJsonObject = (str: string) => {
  try {
    const strJson = JSON.parse(str);
    if (typeof strJson === "object" && strJson) {
      return strJson;
    }
    return false;
  } catch (e) {
    return false;
  }
};
