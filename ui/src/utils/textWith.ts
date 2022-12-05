/**
 * 获取文字长度 （粗略长度 并不完全准确）
 * @param text
 * @param fontStyle
 * @returns
 */
export const getTextWith = (text: string, fontStyle?: any) => {
  let canvas = document.createElement("canvas");
  let context = canvas.getContext("2d");
  if (!context) return;
  context.font =
    fontStyle ||
    "14px -apple-system BlinkMacSystemFont PingFang SC Helvetica Tahoma Arial Microsoft YaHei 微软雅黑 黑体 Heiti sans-serif SimSun 宋体 serif"; // 设置字体样式，当然，也可以在这里给一个默认值

  let dimension = context.measureText(text);
  return dimension.width;
};
