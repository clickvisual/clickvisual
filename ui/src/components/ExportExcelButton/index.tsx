import { Button, Input, message, Modal, Tooltip } from "antd";
import { ExportExcel } from "@/utils/excel";
import { useIntl } from "umi";
import { useEffect, useState } from "react";
import { useRef } from "react";
import IconFont from "../IconFont";

interface ExportExcelButtonProps {
  data: any;
}

const ExportExcelButton = ({ data }: ExportExcelButtonProps) => {
  const i18n = useIntl();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const fileNameRef = useRef("日志");
  const inputRef = useRef<Input | null>(null);

  useEffect(() => {
    if (isModalVisible) {
      if (inputRef.current) {
        inputRef.current.focus({
          cursor: "end",
        });
      }
    }
  }, [isModalVisible, inputRef]);
  const showModal = () => {
    setIsModalVisible(true);
  };
  const handleOK = () => {
    ExportExcel(data, fileNameRef.current);
    setIsModalVisible(false);
  };
  const handleChange = (e: any) => {
    const { value } = e.target;
    if (value) {
      fileNameRef.current = value;
    }
  };
  const handleExportExcel = () => {
    if (data.length > 0) {
      showModal();
    } else {
      message.warn(i18n.formatMessage({ id: "noData" }));
    }
  };
  return (
    <>
      <Tooltip title={i18n.formatMessage({ id: "export" })}>
        <Button
          onClick={handleExportExcel}
          style={{ marginLeft: "8px" }}
          icon={<IconFont type="icon-export-excel" />}
        />
      </Tooltip>
      {isModalVisible ? (
        <Modal
          title={i18n.formatMessage({ id: "export" })}
          visible={isModalVisible}
          onOk={handleOK}
          onCancel={() => {
            setIsModalVisible(false);
          }}
        >
          <Input
            allowClear
            ref={inputRef}
            onChange={handleChange}
            placeholder={i18n.formatMessage({ id: "fileName" })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleOK();
              }
            }}
            addonAfter=".xlsx"
          />
        </Modal>
      ) : null}
    </>
  );
};

export default ExportExcelButton;
