import { Button, Input, message,Modal } from 'antd';
import {ExportExcel}from "@/utils/excel"
import { useIntl } from 'umi';
import { useEffect, useState } from 'react';
import { useRef } from 'react';

interface ExportExcelButtonProps {
    data: any;
  }

const ExportExcelButton = ({ data }: ExportExcelButtonProps) => {
    const i18n = useIntl();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const fileNameRef=useRef("日志.xlsx")
    const inputRef = useRef<Input | null>(null);

    useEffect(() => {
      if(isModalVisible) {
        if(inputRef.current){
          inputRef.current.focus({
            cursor: 'end'
        })
        }
      }
  }, [isModalVisible,inputRef])
    const showModal = () => {
        setIsModalVisible(true);
    };
    const handleOK = () => {
        ExportExcel(data,fileNameRef.current)
        setIsModalVisible(false);
    };
    const handleChange = (e:any) => {
        const { value } = e.target;
        if (value){
            fileNameRef.current=value
        }
    };
    const handleExportExcel=()=>{
        if (data.length>0){
            showModal()
        }else{
          message.warn(
            i18n.formatMessage({ id: "noData" })
          );
        }
      };
  return (
    <>
    <Button onClick={handleExportExcel}>
        {i18n.formatMessage({ id: "export" })}
    </Button>
     {isModalVisible?<Modal 
        title={i18n.formatMessage({ id: "export" })} 
        visible={isModalVisible}
        onOk={handleOK} 
        onCancel={()=>{setIsModalVisible(false);}}>
       <Input 
        allowClear
        ref={inputRef}
        onChange={handleChange}
        placeholder={i18n.formatMessage({ id: "fileName" })} 
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleOK()
          }
        }} 
        addonAfter=".xlsx"  /> 
    </Modal>:null}
    </>
  );
};

export default ExportExcelButton;
