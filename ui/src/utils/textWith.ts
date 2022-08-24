export const getTextWith = (text: string, fontStyle?: any) => {
  var canvas = document.createElement("canvas");
  var context = canvas.getContext("2d");
  if (!context) return;
  context.font =
    fontStyle ||
    "14px -apple-system BlinkMacSystemFont PingFang SC Helvetica Tahoma Arial Microsoft YaHei 微软雅黑 黑体 Heiti sans-serif SimSun 宋体 serif"; // 设置字体样式，当然，也可以在这里给一个默认值

  var dimension = context.measureText(text);
  return dimension.width;
};
