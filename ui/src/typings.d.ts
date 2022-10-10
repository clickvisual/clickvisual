declare module "slash2";
declare module "*.css";
declare module "*.less";
declare module "*.scss";
declare module "*.sass";
declare module "*.svg";
declare module "*.png";
declare module "*.jpg";
declare module "*.jpeg";
declare module "*.gif";
declare module "*.bmp";
declare module "*.tiff";
declare module "omit.js";
declare module "numeral";
declare module "@antv/data-set";
declare module "mockjs";
declare module "react-fittext";
declare module "bizcharts-plugin-slider";
declare module "d3";
// declare module "codemirror/lib/codemirror.js";
// declare module "codemirror/addon/fold/foldcode.js";
// declare module "codemirror/addon/fold/foldgutter.js";
// declare module "codemirror/addon/fold/brace-fold.js";
// declare module "codemirror/addon/hint/javascript-hint.js";
// declare module "codemirror/addon/hint/show-hint.js";
// declare module "codemirror/addon/lint/lint.js";
// declare module "codemirror/addon/lint/json-lint.js";
// declare module "codemirror/addon/lint/javascript-lint.js";
// declare module "codemirror/addon/display/placeholder.js";
// declare module "codemirror/mode/javascript/javascript.js";
// declare module "codemirror/mode/sql/sql.js";

// preview.pro.ant.design only do not use in your production ;
// preview.pro.ant.design Dedicated environment variable, please do not use it in your project.
declare let ANT_DESIGN_PRO_ONLY_DO_NOT_USE_IN_YOUR_PRODUCTION:
  | "site"
  | undefined;

declare const REACT_APP_ENV: "test" | "dev" | "pre" | false;
