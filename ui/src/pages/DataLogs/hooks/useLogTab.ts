// import { PaneType } from "@/models/datalogs/types";
// import { RestUrlStates } from "@/pages/DataLogs/hooks/useLogUrlParams";
// import useTimeOptions from "@/pages/DataLogs/hooks/useTimeOptions";
// import useUrlState from "@ahooksjs/use-url-state";
// import { useModel } from "@umijs/max";
// import lodash from "lodash";

// const useLogTab = () => {
//   const [_, setUrlState] = useUrlState();
//   const { onChangeSelectKeys } = useModel("instances");

//   const {
//     logPanesHelper,
//     currentLogLibrary,
//     onChangeLogLibrary,
//     onChangeLogPane,
//     resetLogs,
//     onChangeCurrentLogPane,
//     onChangeFoldingState,
//   } = useModel("dataLogs");
//   const { logPanes, removeLogPane } = logPanesHelper;

//   const { handleChangeRelativeAmountAndUnit } = useTimeOptions();

//   const handleChangeTab = (key: string) => {
//     onChangeSelectKeys([`table-${key}`]);
//     const logLibraryId = parseInt(key);
//     if (logLibraryId == currentLogLibrary?.id) return;
//     const tabPane = logPanes.filter((item: PaneType) => item.paneId == key)[0];
//     if (!tabPane) return;
//     handleChangeRelativeAmountAndUnit(tabPane);
//     console.log(tabPane, "tabPane");
//     onChangeLogPane(tabPane);
//   };

//   const onEdit = (currentKey: any, action: any) => {
//     if (!currentKey || action !== "remove") return;
//     const currentPanes = lodash.cloneDeep(logPanes);
//     const resultLogPanes =
//       logPanes.filter((key: PaneType) => key.paneId != currentKey) || [];
//     const len = resultLogPanes.length;
//     removeLogPane(currentKey);
//     if (len === 0) {
//       resetLogs();
//       setUrlState(RestUrlStates);
//       onChangeLogLibrary(undefined);
//     }
//     if (len > 0 && parseInt(currentKey) === currentLogLibrary?.id) {
//       const currentPane = resultLogPanes[0];
//       const newLogPane: PaneType[] = currentPanes.filter(
//         (item: PaneType) => item.paneId != currentKey
//       );
//       handleChangeRelativeAmountAndUnit(currentPane);
//       onChangeCurrentLogPane(currentPane, newLogPane);
//       onChangeLogLibrary({
//         id: parseInt(currentPane.paneId),
//         tableName: currentPane.pane,
//         createType: currentPane.paneType,
//         desc: currentPane.desc,
//         relTraceTableId: currentPane.relTraceTableId,
//       });
//     }
//   };

//   // 全屏/取消全屏 事件
//   const handleFullScreen = () => {
//     //全屏
//     let docElm: any = document.documentElement;
//     const isFull = isFullscreenForNoScroll();
//     onChangeFoldingState(!isFull);
//     if (isFull) {
//       //W3C
//       if (document.exitFullscreen) {
//         document.exitFullscreen();
//       }
//     } else {
//       //W3C
//       if (docElm.requestFullscreen) {
//         docElm.requestFullscreen();
//       }
//     }
//   };

//   // 判断浏览器是否全屏
//   const isFullscreenForNoScroll: () => boolean = () => {
//     let explorer = window.navigator.userAgent.toLowerCase();
//     if (explorer.indexOf("chrome") > 0) {
//       //webkit
//       return (
//         document.body.scrollHeight === window.screen.height &&
//         document.body.scrollWidth === window.screen.width
//       );
//     } else {
//       //IE 9+  fireFox
//       return (
//         window.outerHeight === window.screen.height &&
//         window.outerWidth === window.screen.width
//       );
//     }
//   };

//   return { handleChangeTab, onEdit, handleFullScreen, isFullscreenForNoScroll };
// };
// export default useLogTab;
