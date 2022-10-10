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
}) => {
  const { title, value, placeholder, onPressEnter, onChange } = props;
  const formRefs: any = useRef(null);
  const [sqlValue, setSqlValue] = useState<string>("");

  const onEditorDidMount = (editor: any) => {
    let editors = formRefs?.current?.editor;
  };

  // 回车事件
  const handleEnter = () => {
    onPressEnter();
  };

  useEffect(() => {
    setSqlValue(value);
  }, [value]);

  // const changeCode = (CodeMirror, changeObj, value) => {
  //   if (!value) return;
  //   // 获取 CodeMirror.doc.getValue()
  //   // 赋值 CodeMirror.doc.setValue(value) // 会触发 onChange 事件，小心进入无线递归。
  //   this.setState({ text: value });
  // };

  return (
    <div className={styles.editors} key={title + "editors"}>
      <CodeMirror
        className={styles.editorsDom}
        ref={formRefs}
        key={title}
        editorDidMount={onEditorDidMount}
        onKeyPress={() => {
          // 按键的时候触发代码提示
          formRefs.current.editor.showHint();
        }}
        onChange={(CodeMirror: string, changeObj: any, value: string) =>
          onChange(value)
        }
        value={sqlValue}
        options={{
          // 显示行号
          lineNumbers: true,
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
            tables: {
              users: ["name", "score", "birthDate"],
              countries: ["name", "population", "size"],
              score: ["zooao"],
            },
          },
          autofocus: false,
          styleActiveLine: true,
          // 主题
          theme: "neo",
          lineWrapping: true,
          foldGutter: true,
          gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
          lint: false,
          indentUnit: 2,
          cursorHeight: 0.85,
          placeholder: placeholder || "",
          tabSize: 2,
        }}
      />
    </div>
  );
};

export default Editors;
