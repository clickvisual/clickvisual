import {
  UpdateSourceType,
  CreateSourceType,
} from "@/services/dataSourceManage";
import { Form, FormInstance, Input, message, Modal, Select } from "antd";
import { useEffect, useRef } from "react";
import { useModel, useIntl } from "umi";

const { Option } = Select;

const CreateAndUpdateModel = () => {
  const i18n = useIntl();
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
          message.success(i18n.formatMessage({ id: "models.pms.create.suc" }));
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
          message.success(i18n.formatMessage({ id: "models.pms.update.suc" }));
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
      title={
        isUpdate
          ? i18n.formatMessage({
              id: "bigdata.dataSourceManage.searchBar.dataSourceType.create",
            })
          : i18n.formatMessage({
              id: "bigdata.dataSourceManage.searchBar.dataSourceType.create",
            })
      }
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
          label={i18n.formatMessage({
            id: "bigdata.dataSourceManage.create.typ",
          })}
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
          label={i18n.formatMessage({
            id: "bigdata.dataSourceManage.dataTable.dataSourceName",
          })}
          name={"name"}
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label={i18n.formatMessage({
            id: "bigdata.dataSourceManage.dataTable.dataSourceDesc",
          })}
          name={"desc"}
        >
          <Input />
        </Form.Item>
        <Form.Item label={`Url`} name={"url"} rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({
            id: "bigdata.dataSourceManage.create.userName",
          })}
          name={"username"}
          rules={[{ required: true }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={i18n.formatMessage({ id: "login.password" })}
          name={"password"}
          rules={[{ required: true }]}
        >
          <Input.Password />
        </Form.Item>
      </Form>
    </Modal>
  );
};
export default CreateAndUpdateModel;
