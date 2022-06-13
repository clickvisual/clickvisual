export const byteConvert = (bytes: number) => {
  let byte: any = bytes;
  if (isNaN(byte)) {
    return "";
  }
  let symbols = ["bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  let exp = Math.floor(Math.log(byte) / Math.log(2));
  if (exp < 1) {
    exp = 0;
  }
  let i = Math.floor(exp / 10);
  byte = byte / Math.pow(2, 10 * i);

  if (byte.toString().length > byte.toFixed(2).toString().length) {
    byte = byte.toFixed(2);
  }
  return byte + " " + symbols[i];
};
