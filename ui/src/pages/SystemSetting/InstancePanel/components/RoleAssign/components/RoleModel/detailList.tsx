import { Button, Form, Select } from "antd";
import { useModel } from "@@/plugin-model/useModel";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import styles from "./index.less";
import { useIntl } from "umi";

const { Option } = Select;

const DetailList = () => {
  const i18n = useIntl();
  const { commonInfo } = useModel("pms");
  return (
    <Form.List
      name={"details"}
      rules={[
        {
          validator: async (_, details) => {
            if (!details || details.length < 1) {
              return Promise.reject(
                new Error(
                  i18n.formatMessage({
                    id: "systemSetting.instancePanel.roleAssign.roleModel.detailList.errorText",
                  })
                )
              );
            }
            return undefined;
          },
        },
      ]}
    >
      {(fields, option, { errors }) => (
        <>
          {fields.map((field) => (
            <div key={`details-${field.key}`} className={styles.formList}>
              <Form.Item
                {...field}
                fieldKey={field.fieldKey}
                label={i18n.formatMessage({
                  id: "systemSetting.instancePanel.roleAssign.roleModel.detailList.label.subresource",
                })}
                name={[field.name, "subResources"]}
                className={styles.formActItem}
                rules={[
                  {
                    required: true,
                    message: i18n.formatMessage({
                      id: "systemSetting.instancePanel.roleAssign.roleModel.detailList.label.subresource.placeholder",
                    }),
                  },
                ]}
              >
                <Select
                  mode="multiple"
                  allowClear
                  placeholder={i18n.formatMessage({
                    id: "systemSetting.instancePanel.roleAssign.roleModel.detailList.label.subresource.placeholder",
                  })}
                  onChange={(val) => {}}
                >
                  {commonInfo?.app_subResources_info.map((item) => (
                    <Option key={`acts-${item.name}`} value={item.name}>
                      {item.desc}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                {...field}
                fieldKey={field.fieldKey}
                label={i18n.formatMessage({
                  id: "systemSetting.instancePanel.roleAssign.roleModel.detailList.label.allow",
                })}
                name={[field.name, "acts"]}
                className={styles.formSourceItem}
                rules={[
                  {
                    required: true,
                    message: i18n.formatMessage({
                      id: "systemSetting.instancePanel.roleAssign.roleModel.detailList.label.allow.placeholder",
                    }),
                  },
                ]}
              >
                <Select
                  mode="multiple"
                  allowClear
                  placeholder={i18n.formatMessage({
                    id: "systemSetting.instancePanel.roleAssign.roleModel.detailList.label.allow.placeholder",
                  })}
                >
                  {commonInfo?.all_acts_info.map((item) => (
                    <Option key={`subResources-${item.name}`} value={item.name}>
                      {item.desc}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <MinusCircleOutlined
                className={styles.icon}
                onClick={() => option.remove(field.name)}
              />
            </div>
          ))}
          <Form.Item noStyle>
            <Button
              type="dashed"
              onClick={() => option.add()}
              block
              icon={<PlusOutlined />}
            >
              {i18n.formatMessage({
                id: "systemSetting.instancePanel.roleAssign.roleModel.detailList.create",
              })}
            </Button>
            <Form.ErrorList errors={errors} />
          </Form.Item>
        </>
      )}
    </Form.List>
  );
};
export default DetailList;
