import { useRef } from "react";
import styles from "./index.less";
import { UnControlled as CodeMirror } from "react-codemirror2";
import ReactDom from "react-dom";

// // 白色主题
import "codemirror/theme/neo.css";
import {
  FontSizeOutlined,
  HistoryOutlined,
  KeyOutlined,
} from "@ant-design/icons";
// import { Tooltip } from "antd";
import useLocalStorages from "@/hooks/useLocalStorages";
import { dataLogLocalaStorageType } from "@/models/dataLogs";

// require("codemirror/lib/codemirror.css"); //关键信息引入
// require("codemirror/theme/seti.css"); //引入主题颜色
// require("codemirror/addon/display/fullscreen.css");
// require("codemirror/addon/display/panel");
// require("codemirror/mode/sql/sql.js");
// require("codemirror/mode/xml/xml"); //引入编辑语言  xml
// require("codemirror/mode/javascript/javascript"); //引入编辑语言  JavaScript
// require("codemirror/mode/yaml/yaml"); //引入编辑语言 yaml
// require("codemirror/addon/display/fullscreen");
// require("codemirror/addon/edit/matchbrackets");
// require("codemirror/addon/selection/active-line"); //代码高亮
// require("codemirror/addon/fold/foldgutter.css"); // 代码折叠
// require("codemirror/addon/fold/foldcode.js"); // 代码折叠
// require("codemirror/addon/fold/foldgutter.js"); // 代码折叠
// require("codemirror/addon/fold/brace-fold.js"); // 代码折叠
// require("codemirror/addon/fold/comment-fold.js"); // 代码折叠

// hint/anyword-hint.js  上下文代码补全

// import "codemirror/addon/fold/foldgutter.css";

// import "codemirror/addon/lint/lint.css";
// import "codemirror/addon/fold/foldcode.js";
// import "codemirror/addon/fold/foldgutter.js";
// import "codemirror/addon/fold/brace-fold.js";
// import "codemirror/addon/hint/anyword-hint.js";
// import "codemirror/addon/lint/lint.js";
// import "codemirror/addon/lint/json-lint.js";
// import "codemirror/addon/lint/javascript-lint.js";
// import "codemirror/addon/display/placeholder.js";
// import "codemirror/mode/sql/sql.js";
// import "codemirror/mode/javascript/javascript.js";

// // 引入代码自动提示插件
// import "codemirror/addon/hint/show-hint.css";
import "codemirror/addon/hint/sql-hint";
import { useIntl } from "umi";
import { MYSQL_KEYWORD } from "./MySQLKeyWord";
// import "codemirror/addon/hint/show-hint";

// import "codemirror/lib/codemirror.css";
// import "codemirror/addon/hint/show-hint.css";

// require("codemirror/lib/codemirror");
// require("codemirror/mode/sql/sql");
// require("codemirror/addon/hint/show-hint");
// require("codemirror/addon/hint/sql-hint");

// import "codemirror/keymap/sublime";
// import "codemirror/theme/monokai.css";

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
  // onChangeTables: (obj: any) => void;
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
   * 处理历史数据和分析字段的提示优先级
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
    // 用空格分割然后取最后一个单词
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
    // // TODO: 再将字符拆分为一个一个的
    // for (let i = 0; i < lowerCase.length; i++) {
    //   const characterItem = lowerCase[i];
    //   console.log(characterItem, "characterItem");
    // }
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
    list.map((item: string) => {
      // 从头开始匹配的优先级大于从中间开始匹配的
      if (item.indexOf(currentWord) === 0) {
        priorityArr.push({
          text: item,
          displayIcon: icon,
          displayText: infoText,
          isHistory: codeHintsType == CodeHintsType.history,
          render: hintRender,
        });
      }
      if (item.indexOf(currentWord) > 0) {
        arr.push({
          text: item,
          displayIcon: icon,
          displayText: infoText,
          isHistory: codeHintsType == CodeHintsType.history,
          render: hintRender,
        });
      }
    });
    return [...priorityArr, ...arr];
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

  const hintRender = (
    element: { appendChild: (arg0: HTMLDivElement) => void },
    self: any,
    data: {
      isHistory: boolean;
      displayText: string;
      displayIcon: any;
      text: string;
    }
  ) => {
    let div = document.createElement("div");
    div.setAttribute("class", "autocomplete-div");

    let divIcon = document.createElement("div");
    divIcon.setAttribute("class", "autocomplete-icon");

    let divText = document.createElement("div");
    divText.setAttribute("class", "autocomplete-text");
    divText.innerText = data.text;

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
            // e.preventDefault();
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
          // onInputRead={() => {
          //   // 按键的时候触发代码提示
          //   formRefs.current.editor.showHint();
          // }}
          // onKeyHandled={(e, r, t) => console.log(e, r, t)}
          // onFocus={() => {
          //   // const CodeMirror = formRefs.current?.editor;
          //   if (formRefs.current.editor.getValue() === "") {
          //     // formRefs.current.editor.setOption({
          //     //   hintOptions: {
          //     //     tables: historicalRecord,
          //     //   },
          //     // });
          //     // 值为空的时候聚焦会主动吊起历史记录提示框
          //     formRefs.current.editor.showHint();
          //   }
          // }}
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
            // extraKeys: { Enter: handleEnter, "Ctrl+1": autoComplete },
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
            // gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
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
