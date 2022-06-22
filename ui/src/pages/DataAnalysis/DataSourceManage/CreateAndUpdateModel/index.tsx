import {
  UpdateSourceType,
  CreateSourceType,
} from "@/services/dataSourceManage";
import { Form, FormInstance, Input, message, Modal, Select } from "antd";
import { useEffect, useRef } from "react";
import { useModel } from "umi";

const { Option } = Select;

const CreateAndUpdateModel = () => {
  const DataSourceForm = useRef<FormInstance>(null);
  const { dataSourceManage, currentInstances } = useModel("dataAnalysis");
  const {
    doCreateSource,
    doUpdateSource,
    isUpdate,
    typList,
    visibleDataSource,
    currentDataSource,
    onSearch,
    currentTyp,
    changeIsUpdate,
    changeVisibleDataSource,
    changeCurrentDataSource,
  } = dataSourceManage;

  const handleSubmit = (file: UpdateSourceType) => {
    if (!isUpdate) {
      const data: CreateSourceType = {
        iid: currentInstances as number,
        ...file,
      };
      doCreateSource.run(data).then((res: any) => {
        if (res.code == 0) {
          message.success("新建成功");
          onSearch(currentInstances as number, {
            typ: currentTyp as number,
          });
          changeVisibleDataSource(false);
        }
      });
      return;
    }
    const data: UpdateSourceType = {
      ...file,
    };
    doUpdateSource
      .run(currentDataSource?.id as number, data)
      .then((res: any) => {
        if (res.code == 0) {
          message.success("修改成功");
          onSearch(currentInstances as number, {
            typ: currentTyp as number,
          });
          changeVisibleDataSource(false);
        }
      });
  };

  useEffect(() => {
    if (!visibleDataSource) {
      DataSourceForm.current?.resetFields();
      changeCurrentDataSource(undefined);
      changeIsUpdate(false);
    }
  }, [visibleDataSource]);

  useEffect(() => {
    if (currentDataSource && isUpdate) {
      DataSourceForm.current?.setFieldsValue({
        typ: currentDataSource.typ,
        name: currentDataSource.name,
        username: currentDataSource.username,
        desc: currentDataSource.desc,
        url: currentDataSource.url,
        password: currentDataSource.password,
      });
    }
  }, [currentDataSource, isUpdate]);

  return (
    <Modal
      width={700}
      confirmLoading={doUpdateSource.loading || doCreateSource.loading}
      title={isUpdate ? "修改数据源" : "新增数据源"}
      visible={visibleDataSource}
      bodyStyle={{ paddingBottom: 0 }}
      onCancel={() => changeVisibleDataSource(false)}
      onOk={() => DataSourceForm.current?.submit()}
    >
      <Form
        labelCol={{ span: 5 }}
        wrapperCol={{ span: 14 }}
        ref={DataSourceForm}
        onFinish={handleSubmit}
      >
        <Form.Item
          label={`种类`}
          name={"typ"}
          // hidden
          rules={[{ required: true }]}
        >
          <Select>
            {typList.map((item: { title: string; value: number }) => {
              return (
                <Option value={item.value} key={item.value}>
                  {item.title}
                </Option>
              );
            })}
          </Select>
        </Form.Item>
        <Form.Item
          label={`数据源名称`}
          name={"name"}
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>

        <Form.Item label={`数据源描述`} name={"desc"}>
          <Input />
        </Form.Item>
        <Form.Item label={`url`} name={"url"} rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item
          label={`用户名`}
          name={"username"}
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={`密码`}
          name={"password"}
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
};
export default CreateAndUpdateModel;
