import { Workbook } from "exceljs";

export async function ExportExcel(
  tddata: Record<string, unknown>[],
  filename: string = "数据",
  sheetName: string = "sheet1"
) {
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  const columnKeys = Array.from(
    new Set(tddata.flatMap((row) => Object.keys(row)))
  );

  worksheet.columns = columnKeys.map((key) => ({
    header: key,
    key,
  }));
  worksheet.addRows(tddata);

  const workbookBuffer = await workbook.xlsx.writeBuffer();
  openDownloadDialog(
    new Blob([workbookBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${filename}.xlsx`
  );
}

const openDownloadDialog = (url: Blob | string, saveName: string) => {
  if (url instanceof Blob) {
    url = URL.createObjectURL(url);
  }
  const aLink = document.createElement("a");
  aLink.href = url;
  aLink.download = saveName || "";
  let event;
  if (window.MouseEvent) event = new MouseEvent("click");
  else {
    event = document.createEvent("MouseEvents");
    event.initMouseEvent(
      "click",
      true,
      false,
      window,
      0,
      0,
      0,
      0,
      0,
      false,
      false,
      false,
      false,
      0,
      null
    );
  }
  aLink.dispatchEvent(event);
  setTimeout(() => URL.revokeObjectURL(aLink.href), 4e4);
};
