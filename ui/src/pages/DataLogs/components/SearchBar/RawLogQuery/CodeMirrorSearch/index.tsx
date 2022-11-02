import styles from "./index.less";
import ReactDom from "react-dom";
import { useIntl } from "umi";
import { useRef } from "react";
import { UnControlled as CodeMirror } from "react-codemirror2";
// 白色主题
import "codemirror/theme/neo.css";
import {
  FontSizeOutlined,
  HistoryOutlined,
  KeyOutlined,
} from "@ant-design/icons";
import "codemirror/addon/hint/sql-hint";
import { dataLogLocalaStorageType } from "@/models/dataLogs";
import useLocalStorages from "@/hooks/useLocalStorages";
import { MYSQL_KEYWORD } from "./MySQLKeyWord";

export enum CodeHintsType {
  history = 1,
  analysisField = 2,
  keyword = 3,
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
  } = props;
  const formRefs: any = useRef(null);
  const i18n = useIntl();
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
    list: string[],
    str: string,
    codeHintsType: CodeHintsType,
    location: number
  ) => {
    // 先将输入的字符转小写 关键词转大写
    const lowerCase: string =
      codeHintsType != CodeHintsType.keyword
        ? str.toLowerCase()
        : str.toUpperCase();
    // 用空格分割然后找到所编辑的单词
    const strArr = lowerCase.split(" ");
    let totalLenght = 0;
    let currentWord = "";
    // 为了查找光标所在的单词
    for (let i = 0; i < strArr.length; i++) {
      const wordItem = strArr[i];
      if (
        totalLenght < location &&
        totalLenght + (wordItem.length + 1) > location
      ) {
        currentWord = wordItem;
        break;
      }
      totalLenght += wordItem.length + 1;
    }
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
      default:
    }
    let arr: any[] = [];
    let priorityArr: any[] = [];
    let allArr: any[] = [];
    list.map((item: string) => {
      // 从头开始匹配的优先级大于从中间开始匹配的大于模糊搜索
      if (item.indexOf(currentWord) === 0) {
        priorityArr.push(item);
      }
      if (item.indexOf(currentWord) > 0) {
        arr.push(item);
      }
    });

    allArr = [...priorityArr, ...arr];

    // 处理模拟数据
    let fuzzyList = fuzzyQuery(list, currentWord);
    fuzzyList.map((item: any) => {
      // 模糊搜索结果先过滤
      if (!allArr.includes(item)) {
        allArr.push(item);
      }
    });

    // 将字符串数组变更为对象数组
    let resultArr: any[] = [];
    allArr.map((item: any) => {
      let text: any = document.createElement("span");
      let virtualDom: any;
      handleHighlightAndPrompt(
        item,
        currentWord,
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
  const fuzzyQuery = (list: string[], keyWord: string): Array<any> => {
    let arr: any[] = [];
    const selectList = keyWord.split("");
    var reg = new RegExp(".*" + selectList.join(".*") + ".*", "i");
    list.map((listItem: string) => {
      if (reg.test(listItem)) {
        arr.push(listItem);
      }
    });

    return arr;
  };

  /**
   * 对匹配的提示项作高亮输入词的处理
   * @promptText 匹配的提示项
   * @currentWord 输入的词
   * @virtualDom 只定义未赋值的虚拟dom*
   * @arr 要填充的数组
   * @——————下面只做赋值不做处理无需关心————————
   * @text 空dom元素span
   * @icon icon
   * @infoText 种类文本
   * @codeHintsType 种类枚举
   */
  const handleHighlightAndPrompt = (
    promptText: string,
    currentWord: string,
    virtualDom: any,
    arr: any[],
    text: any,
    icon: any,
    infoText: any,
    codeHintsType: any
  ) => {
    let c = promptText;
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

    ReactDom.render(virtualDom, text);
    arr.push({
      text: promptText,
      domText: text,
      displayIcon: icon,
      displayText: infoText,
      isHistory: codeHintsType == CodeHintsType.history,
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
    let cursor = cmInstance.getCursor();
    let cursorLine = cmInstance.getLine(cursor.line);
    let end = cursor.ch;

    let token = cmInstance.getTokenAt(cursor);
    // 按键触发的显示三种提示
    if (cursorLine && cursorLine.length > 0 && cursorLine != "`") {
      const historyList = handleCodePromptRecord(
        historicalRecord,
        cursorLine,
        CodeHintsType.history,
        end
      );
      const list = handleCodePromptRecord(
        tables,
        cursorLine,
        CodeHintsType.analysisField,
        end
      );

      const keyWordList = handleCodePromptRecord(
        MYSQL_KEYWORD,
        cursorLine,
        CodeHintsType.keyword,
        end
      );

      return {
        list: [...historyList, ...list, ...keyWordList] || [],
        from: { ch: token.start, line: cursor.line },
        to: { ch: token.end, line: cursor.line },
      };
    }
    // 否则显示一种提示
    const allHistoryList = handleCodePromptRecord(
      historicalRecord,
      "",
      CodeHintsType.history,
      end
    );

    return {
      list: [...allHistoryList] || [],
      from: { ch: token.start, line: cursor.line },
      to: { ch: token.end, line: cursor.line },
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
      isHistory: boolean; // 是否是历史记录
      displayText: string; // 注释文本
      displayIcon: any; // 注释icon
      domText: any; // 用于显示文本样式的dom
      text: string; // 用于替换的文本 string
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

    ReactDom.render(data.displayIcon, divIcon);
    div.appendChild(divIcon);
    div.appendChild(divText);
    div.appendChild(divInfo);

    if (data.isHistory) {
      var delIcon = document.createElement("div");
      delIcon.setAttribute("class", "autocomplete-delete");

      const delDom = (
        <span
          onClick={(e) => {
            e.stopPropagation();
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
          }}
        >
          ×
        </span>
      );
      ReactDom.render(delDom, delIcon);
      data.isHistory && delIcon && div.appendChild(delIcon);
    }

    element.appendChild(div);
  };

  return (
    <div className={styles.editors} key={title + "editors"}>
      <span className={styles.where}>WHERE</span>
      <div className={styles.codemirrorInput}>
        <CodeMirror
          className={styles.editorsDom}
          ref={formRefs}
          key={title}
          onKeyPress={(a, b) => {
            // 阻止回车换行事件
            if (b.charCode == 13) {
              b.preventDefault();
              return;
            }
            // 按字母键的时候触发代码提示
            if (
              (b.charCode <= 90 && b.charCode >= 65) ||
              (b.charCode <= 122 && b.charCode >= 97) ||
              b.charCode == 96 ||
              b.charCode == 32
            ) {
              formRefs.current.editor.showHint();
            }
          }}
          onChange={(CodeMirror: string, changeObj: any, value: string) =>
            onChange(value)
          }
          value={value}
          options={{
            // 显示行号
            lineNumbers: false,
            // 改变行号文案
            lineNumberFormatter: () => "WHERE",
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
            lineWrapping: false,
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
          }}
        />
        <span className={styles.afterBox}></span>
      </div>
    </div>
  );
};

export default Editors;
