import { useState, useEffect, useRef } from "react";
import styles from "./index.less";
import { UnControlled as CodeMirror } from "react-codemirror2";

import "codemirror/lib/codemirror.css";
import "codemirror/lib/codemirror.js";

// 白色主题
import "codemirror/theme/neo.css";
import "codemirror/addon/fold/foldgutter.css";

import "codemirror/addon/lint/lint.css";
import "codemirror/addon/fold/foldcode.js";
import "codemirror/addon/fold/foldgutter.js";
import "codemirror/addon/fold/brace-fold.js";
import "codemirror/addon/hint/javascript-hint.js";
import "codemirror/addon/lint/lint.js";
import "codemirror/addon/lint/json-lint.js";
import "codemirror/addon/lint/javascript-lint.js";
import "codemirror/addon/display/placeholder.js";
import "codemirror/mode/sql/sql.js";
import "codemirror/mode/javascript/javascript.js";

// 引入代码自动提示插件
import "codemirror/addon/hint/show-hint.css";
import "codemirror/addon/hint/sql-hint";
import "codemirror/addon/hint/show-hint";

const Editors = (props: {
  title: string;
  placeholder: string;
  value: string;
  onPressEnter: () => void;
  onChange: (value: string) => void;
  tables: any;
  onChangeTables: (obj: any) => void;
}) => {
  const { title, value, placeholder, onPressEnter, onChange, tables } = props;
  const formRefs: any = useRef(null);

  // const onEditorDidMount = (editor: any) => {};

  // 回车事件
  const handleEnter = () => {
    onPressEnter();
  };

  return (
    <div className={styles.editors} key={title + "editors"}>
      <span className={styles.where}>WHERE</span>
      <div className={styles.codemirrorInput}>
        <CodeMirror
          className={styles.editorsDom}
          ref={formRefs}
          key={title}
          // editorDidMount={onEditorDidMount}
          onKeyPress={() => {
            // 按键的时候触发代码提示
            formRefs.current.editor.showHint();
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
              tables: tables,
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
