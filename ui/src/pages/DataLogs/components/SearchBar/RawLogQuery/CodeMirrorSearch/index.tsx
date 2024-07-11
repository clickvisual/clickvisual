import { useRef, useState } from "react";
import { UnControlled as CodeMirror } from "react-codemirror2";
import { useIntl, useModel } from "umi";
import styles from "./index.less";
// 白色主题
import useLocalStorages from "@/hooks/useLocalStorages";
import { dataLogLocalaStorageType } from "@/models/dataLogs";
import CreateLogFilter from "@/pages/DataLogs/components/CreateLogFilter";
import { LogFilterType } from "@/services/dataLogs";
import {
  FontSizeOutlined,
  HistoryOutlined,
  KeyOutlined,
  PushpinOutlined,
} from "@ant-design/icons";
import classNames from "classnames";
import "codemirror/theme/neo.css";
import { createRoot } from "react-dom/client";
import { MYSQL_KEYWORD } from "./MySQLKeyWord";
import WhereBox from "./WhereBox";

export enum CodeHintsType {
  history = 1,
  analysisField = 2,
  keyword = 3,
  /**
   * 收藏历史记录
   */
  // collection = 4,
  /**
   * 当前输入值
   */
  value = 5,
}

const Editors = (props: {
  title: string;
  placeholder: string;
  value: string;
  onPressEnter: () => void;
  onChange: (value: string) => void;
  tables: any;
  historicalRecord: any;
  onChangeHistoricalRecord: (data: { [tid: number]: string[] }) => void;
  currentTid: number;
  logQueryHistoricalList: { [tid: number]: string[] };
  collectingHistorical: LogFilterType[];
  isMultipleLines: boolean;
  onChangeIsMultipleLines: (flag: boolean) => void;
  onChangeIsDefault: (flag: boolean) => void;
}) => {
  const {
    title,
    value,
    placeholder,
    onPressEnter,
    onChange,
    tables,
    historicalRecord,
    onChangeHistoricalRecord,
    currentTid,
    logQueryHistoricalList,
    collectingHistorical,
    isMultipleLines,
    onChangeIsMultipleLines,
    onChangeIsDefault,
  } = props;

  const { logsLoading } = useModel("dataLogs");

  const formRefs: any = useRef(null);
  const i18n = useIntl();
  const [isFocus, setIsFocus] = useState<boolean>(false);
  const { onSetLocalData } = useLocalStorages();

  // 回车事件
  const handleEnter = () => {
    onPressEnter();
  };

  /**
   * 处理历史数据和分析字段的提示优先级、匹配提示
   * list
   * str 输入的字符串
   * codeHintsType 提示种类 CodeHintsType
   */
  const handleCodePromptRecord = (
    list: string[] | LogFilterType[],
    str: string,
    codeHintsType: CodeHintsType,
    location: number
  ) => {
    // 先将输入的字符转小写 关键词转大写
    const lowerCase: string =
      codeHintsType != CodeHintsType.keyword
        ? str.toLowerCase()
        : str.toUpperCase();
    // 分配不同类型的icon和文本
    let icon: any = <></>;
    let infoText: any = "";
    switch (codeHintsType) {
      case CodeHintsType.history:
        icon = <HistoryOutlined />;
        infoText = i18n.formatMessage({
          id: "log.search.codeHinting.historyQuery",
        });
        break;
      case CodeHintsType.analysisField:
        icon = <FontSizeOutlined />;
        infoText = i18n.formatMessage({
          id: "log.search.codeHinting.analysisField",
        });
        break;
      case CodeHintsType.keyword:
        icon = <KeyOutlined />;
        infoText = i18n.formatMessage({ id: "log.search.codeHinting.keyword" });
        break;
      case CodeHintsType.value:
        icon = <PushpinOutlined />;
        infoText = i18n.formatMessage({ id: "log.search.codeHinting.value" });
        break;
      default:
    }
    let arr: any[] = [];
    let priorityArr: any[] = [];
    let allArr: any[] = [];
    list.map((item: any) => {
      // 从头开始匹配的优先级大于从中间开始匹配的大于模糊搜索
      if (item.indexOf(lowerCase) === 0) {
        priorityArr.push({
          text: item,
        });
      }
      if (item.indexOf(lowerCase) > 0) {
        arr.push({
          text: item,
        });
      }
      allArr = [...priorityArr, ...arr];

      // 暂时取消模糊查询 优化性能
      // 处理模糊数据
      // const fuzzyList = fuzzyQuery(list, lowerCase);

      // fuzzyList.map((item: any) => {
      //   // 模糊搜索结果先过滤
      //   if (
      //     allArr.filter((allArrItem: any) => item.includes(allArrItem.text))
      //       .length == 0
      //   ) {
      //     allArr.push({
      //       text: item,
      //     });
      //   }
    });

    // 将字符串数组变更为对象数组
    let resultArr: any[] = [];
    allArr.map((item: any) => {
      let text: any = document.createElement("span");
      let virtualDom: any;
      handleHighlightAndPrompt(
        item,
        lowerCase,
        virtualDom,
        resultArr,
        text,
        icon,
        infoText,
        codeHintsType
      );
    });

    return resultArr;
  };

  /**
   * 使用test方法实现模糊查询
   * @param  {Array}  list     原数组
   * @param  {String} keyWord  查询的关键词
   * @return {Array}           查询的结果
   */
  // const fuzzyQuery = (list: any[], keyWord: string): Array<any> => {
  //   let arr: any[] = [];
  //   const selectList = keyWord.split("");
  //   let reg = new RegExp(".*" + selectList.join(".*") + ".*", "i");
  //   list.map((listItem: string) => {
  //     if (reg.test(listItem)) {
  //       arr.push(listItem);
  //     }
  //   });

  //   return arr;
  // };

  /**
   * 对匹配的提示项作高亮输入词的处理
   * @promptText 匹配的提示项
   * @currentWord 输入的词
   * @virtualDom 只定义未赋值的虚拟dom*
   * @arr 要填充的数组
   * @codeHintsType 种类枚举
   * @——————下面只做赋值不做处理无需关心————————
   * @text 空dom元素span
   * @icon icon
   * @infoText 种类文本
   */
  const handleHighlightAndPrompt = (
    promptText: { text: string; id?: number; statement?: string },
    currentWord: string,
    virtualDom: any,
    arr: any[],
    text: any,
    icon: any,
    infoText: any,
    codeHintsType: CodeHintsType
  ) => {
    let c = promptText.text;
    let TemporaryArr: string[] = [];
    // 将提示语句中的关键字母替换成高亮字母，替换后拿后面的字符串进行下一次替换 可以解决高亮的字母顺序与输入字母顺序不一致的问题
    currentWord.split("").map((item: any, index: number) => {
      const locationIndex = c.indexOf(item);
      if (locationIndex > -1) {
        TemporaryArr.push(c.substring(0, locationIndex));
        TemporaryArr.push(
          `<span style="color:hsl(21, 85%, 56%)">${item}</span>`
        );
        c = c.substring(locationIndex + 1, c.length);
      }
      if (index == currentWord.split("").length - 1) {
        if (c.length > 0) {
          TemporaryArr.push(c);
        }
        c = TemporaryArr.join("");
      }
    });
    virtualDom = <div dangerouslySetInnerHTML={{ __html: c }} />;
    const root = createRoot(text);
    root.render(virtualDom);
    arr.push({
      text: promptText.text,
      domText: text,
      displayIcon: icon,
      displayText: infoText,
      codeHintsType: codeHintsType,
      render: hintRender,
    });
  };

  /**
    使用自定义hint

    1. 第一个入参cmInstance指的是codeMirror实例，第二个是配置中的的hintOptions值。
    2. 从cmInstance中getCursor指的是获取光标实例，光标实例里有行数、列数。
    3. 可以从cmInstance的getLine方法里传入一个行数，从而获取行中的字符串。
    4. token对象是cmInstance对光标所在字符串进行提取处理，从对应语言的类库中判断光标所在字符串的类型，方便hint提示。token中包含start、end、string、type等属性，start和end指的是光标所在字符串在这一行的起始位置和结束位置，string是提取的字符串，type表示该字符串是什么类型（keyword/operator/string等等不定）
    5. 下面方法中返回的结果体意思是：下拉列表中展示hello和world两行提示，from和to表示当用户选择了提示内容后，这些提示内容要替换编辑区域的哪个字符串。方法中的代码含义是替换token全部字符串。
  */
  const handleShowHint = (
    cmInstance: {
      getCursor: () => any;
      getLine: (arg0: any) => any;
      getTokenAt: (arg0: any) => any;
    },
    hintOptions: any
  ) => {
    const cursor = cmInstance.getCursor();
    const end = cursor.ch;

    const token = cmInstance.getTokenAt(cursor);
    // 如果不是从单词最后开始的一律不提示代码提示
    if (token.end != cursor.ch) {
      return {
        list: [],
        from: { ch: 0, line: 0 },
        to: { ch: 0, line: 0 },
      };
    }
    const cursorLine = token.string
      .replace(/((?![A-Z0-9]).)/gi, " ")
      .split(" ");
    const value = cursorLine[cursorLine.length - 1];
    // 按键触发的显示四种提示
    if (value && value.length > 0 && token.string != "`") {
      const cursorLineList = handleCodePromptRecord(
        [value],
        value,
        CodeHintsType.value,
        end
      );
      const historyList = handleCodePromptRecord(
        historicalRecord.slice(0, 10),
        value,
        CodeHintsType.history,
        end
      ).map(item => ({
        ...item,
        from: { ch: 0, line: 0 } // 设置 historyList 的 from 为文本开头
      }));
      const list = handleCodePromptRecord(
        tables,
        value,
        CodeHintsType.analysisField,
        end
      );

      const keyWordList = handleCodePromptRecord(
        MYSQL_KEYWORD,
        value,
        CodeHintsType.keyword,
        end
      );

      return {
        list:
          [...cursorLineList, ...historyList, ...list, ...keyWordList] || [],
        from: { ch: token.end - value.length, line: cursor.line },
        to: { ch: token.end, line: cursor.line },
      };
    }
    // const isBackQuotes = token.string.includes("`");
    // isBackQuotes && token.string?.length == 0
    // 否则显示一种提示
    // 按反引号`出现全部的历史记录
    const allHistoryList = handleCodePromptRecord(
      historicalRecord.slice(0, 10),
      "",
      CodeHintsType.history,
      end
    );

    return {
      list: [...allHistoryList] || [],
      from: { ch: 0, line: 0 }, // 反引号呼出的all历史记录会将全部输入内容替换
      to: { ch: 100, line: 100 },
      // from: { ch: token.end - value.length - 1, line: cursor.line }, // 因为识别不到`,所以不算长度  所以在原先的基础上再减一
      // to: { ch: token.end, line: cursor.line },
    };
  };

  /**
   * 丰富提示框内每一行的功能
   * @param element 一行最外侧的dom元素
   * @param self
   * @param data 传递的一些特异化数据
   */
  const hintRender = (
    element: { appendChild: (arg0: HTMLDivElement) => void },
    self: any,
    data: {
      codeHintsType: CodeHintsType; // 种类
      displayText: string; // 注释文本
      displayIcon: any; // 注释icon
      domText: any; // 用于显示文本样式的dom
      text: string; // 用于替换的文本 string
      id?: number;
    }
  ) => {
    let div = document.createElement("div");
    div.setAttribute("class", "autocomplete-div");

    let divIcon = document.createElement("div");
    divIcon.setAttribute("class", "autocomplete-icon");

    let divText = document.createElement("div");
    divText.setAttribute("class", "autocomplete-text");
    divText.appendChild(data.domText);

    let divInfo = document.createElement("div");
    divInfo.setAttribute("class", "autocomplete-info");
    divInfo.innerText = data.displayText;

    const root = createRoot(divIcon);
    root.render(data.displayIcon);

    div.appendChild(divIcon);
    div.appendChild(divText);
    div.appendChild(divInfo);
    const isNeedFork = data.codeHintsType == CodeHintsType.history;
    if (isNeedFork) {
      let delIcon = document.createElement("div");
      delIcon.setAttribute("class", "autocomplete-delete");

      const delDom = (
        <span
          onClick={(e) => {
            e.stopPropagation();
            if (data.codeHintsType == CodeHintsType.history) {
              handleHistoricalRecords(data);
            }
          }}
        >
          ×
        </span>
      );
      const root = createRoot(delIcon);
      root.render(delDom);
      isNeedFork && delIcon && div.appendChild(delIcon);
    }

    element.appendChild(div);
  };

  /**
   * 删除历史记录
   * @param data
   */
  const handleHistoricalRecords = (data: {
    codeHintsType: CodeHintsType; // 种类
    displayText: string; // 注释文本
    displayIcon: any; // 注释icon
    domText: any; // 用于显示文本样式的dom
    text: string; // 用于替换的文本 string
  }) => {
    const newLogQueryHistoricalList = historicalRecord.filter(
      (item: string) => {
        return item != data.text;
      }
    );
    onChangeHistoricalRecord({
      ...logQueryHistoricalList,
      [currentTid]: newLogQueryHistoricalList,
    });
    onSetLocalData(
      { [currentTid]: newLogQueryHistoricalList },
      dataLogLocalaStorageType.logQueryHistoricalList
    );
    setTimeout(() => {
      formRefs.current.editor.showHint();
    }, 100);
  };

  const options = {
    // 显示行号
    lineNumbers: false,
    // 改变行号文案
    lineNumberFormatter: (line: number) => line,
    mode: {
      name: "text/x-mysql",
    },
    // 自定义快捷键
    extraKeys: { Enter: handleEnter },
    hintOptions: {
      // 自定义提示选项
      completeSingle: false, // 当匹配只有一项的时候是否自动补全
      // 自定义的提示库
      hint: handleShowHint,
      tables: [...tables, ...historicalRecord],
    },
    autofocus: false,
    styleActiveLine: true,
    // 主题
    theme: "neo",
    // 溢出滚动而非换行
    lineWrapping: isMultipleLines,
    foldGutter: true,
    gutters: false,
    lint: false,
    indentUnit: 2,
    // 光标高度
    cursorHeight: 1,
    placeholder: placeholder || "",
    // tab缩进
    tabSize: 2,
    // 滚动条样式
    scrollbarStyle: null,
    readOnly: logsLoading ? "nocursor" : false,
  };

  const handleChange = (CodeMirror: string, changeObj: any, value: string) => {
    if (value.indexOf("\n") > -1 && !isMultipleLines) {
      onChangeIsMultipleLines(true);
    } else if (isMultipleLines && value.indexOf("\n") == -1) {
      onChangeIsMultipleLines(false);
    }
    onChange(value);
  };

  const handleKeyPress = (
    a: any,
    b: { charCode: number; preventDefault: () => void }
  ) => {
    // 阻止回车换行事件
    if (b.charCode == 13 || logsLoading) {
      b.preventDefault();
      return;
    }
    // 按字母键的时候触发代码提示
    if (
      (b.charCode <= 90 && b.charCode >= 65) ||
      (b.charCode <= 122 && b.charCode >= 97) ||
      (b.charCode <= 57 && b.charCode >= 48) ||
      b.charCode == 96 ||
      b.charCode == 32
    ) {
      formRefs.current.editor.showHint();
    }
  };

  return (
    <div
      className={classNames([
        styles.editors,
        !isMultipleLines && styles.oneLine,
      ])}
      key={title + "editors"}
    >
      <WhereBox
        onChange={onChange}
        onChangeIsDefault={onChangeIsDefault}
        collectingHistorical={collectingHistorical}
        onPressEnter={onPressEnter}
      />
      <div
        className={styles.codemirrorInput}
        style={{ overflow: isMultipleLines && isFocus ? "" : "hidden" }}
      >
        <CodeMirror
          className={styles.editorsDom}
          ref={formRefs}
          key={title}
          value={value ?? ""}
          options={options}
          onKeyPress={handleKeyPress}
          onChange={handleChange}
          onBlur={() => {
            onChangeIsDefault(true); // 重置初始value
            setIsFocus(false);
          }}
          onFocus={() => setIsFocus(true)}
        />
        <span className={styles.afterBox}></span>
      </div>
      <CreateLogFilter tid={currentTid} />
    </div>
  );
};

export default Editors;
