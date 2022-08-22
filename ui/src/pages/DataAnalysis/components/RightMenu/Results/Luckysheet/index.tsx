import { useEffect } from "react";

const Luckysheet = (props: { data: any }) => {
  const { data } = props;
  const tabData = data;

  useEffect(() => {
    const luckysheet = window.luckysheet;
    luckysheet.create({
      container: "luckysheet",
      lang: "zh",
      data: [
        {
          name: "luckysheet", //工作表名称
          color: "", //工作表颜色
          index: 0, //工作表索引
          status: 1, //激活状态
          order: 0, //工作表的下标
          hide: 0, //是否隐藏
          row: 30, //行数
          column: 30, //列数
          defaultRowHeight: 20, //自定义行高
          defaultColWidth: 200, //自定义列宽
          celldata: tabData, //初始化使用的单元格数据
          data: [],
          config: {
            merge: {}, //合并单元格
            rowlen: {}, //表格行高
            columnlen: {}, //表格列宽
            rowhidden: {}, //隐藏行
            colhidden: {}, //隐藏列
            borderInfo: {}, //边框
            authority: {}, //工作表保护
          },
          scrollLeft: 0, //左右滚动条位置
          scrollTop: 0, //上下滚动条位置
          luckysheet_select_save: [], //选中的区域
          calcChain: [], //公式链
          isPivotTable: false, //是否数据透视表
          pivotTable: {}, //数据透视表设置
          filter_select: {}, //筛选范围
          filter: null, //筛选配置
          luckysheet_alternateformat_save: [], //交替颜色
          luckysheet_alternateformat_save_modelCustom: [], //自定义交替颜色
          luckysheet_conditionformat_save: {}, //条件格式
          frozen: {}, //冻结行列配置
          chart: [], //图表配置
          zoomRatio: 1, // 缩放比例
          image: [], //图片
          showGridLines: 1, //是否显示网格线
          dataVerification: {}, //数据验证配置
        },
      ],
      showinfobar: false, // 标题部分信息
      showsheetbar: true, // 底部sheet页
      sheetFormulaBar: true, // 是否显示公示栏
      showstatisticBar: false, // 自定义计数栏
      showtoolbar: true, // 默认工具栏是否显示
      enableAddRow: true, // 底部添加行按钮
      showtoolbarConfig: {
        // 自定义配置工具栏
        undoRedo: true, // 撤销重做，注意撤消重做是两个按钮，由这一个配置决定显示还是隐藏
        paintFormat: true, // 格式刷
        mergeCell: true, // '合并单元格'
      },
      cellRightClickConfig: {
        // 自定义右键单元格
        insertColumn: false,
        deleteColumn: false,
        hideRow: false,
        hideColumn: false,
        deleteCell: false,
        sort: false,
        filter: false, // 筛选选区
        chart: false, // 图表生成
        image: false, // 插入图片
        link: false, // 插入链接
        data: false,
        matrix: false,
      },
      // loadUrl: `/api/v1/bigdata/nodes/${id}`,
    });
    return () => luckysheet.destroy();
  }, [data]);

  const luckyCss: any = {
    margin: "0px",
    padding: "0px",
    position: "absolute",
    width: "100%",
    height: "100%",
    left: "0px",
    top: "0px",
  };

  return <div id="luckysheet" style={luckyCss}></div>;
};

export default Luckysheet;
