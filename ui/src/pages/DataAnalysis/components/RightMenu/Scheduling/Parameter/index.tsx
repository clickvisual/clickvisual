import styles from "../index.less";
import { PlusOutlined } from "@ant-design/icons";
import { Form, Input } from "antd";
import { useIntl } from "umi";

const Parameter = () => {
  const i18n = useIntl();

  return (
    <div className={styles.parameter}>
      <Form.List name="args">
        {(fields, { add, remove }) => (
          <>
            <a className={styles.newBtn} onClick={() => add()}>
              <PlusOutlined />
              &nbsp;
              {i18n.formatMessage({
                id: "bigdata.components.RightMenu.Scheduling.Parameter.newButton",
              })}
            </a>
            {fields.map(({ key, name, ...restField }) => (
              <div className={styles.argsItem} key={key}>
                <Form.Item
                  {...restField}
                  name={[name, "key"]}
                  wrapperCol={{ span: 24 }}
                >
                  <Input
                    placeholder={i18n.formatMessage({
                      id: "bigdata.components.RightMenu.Scheduling.Parameter.key.placeholder",
                    })}
                  />
                </Form.Item>
                <span className={styles.span}>=</span>
                <Form.Item
                  {...restField}
                  name={[name, "val"]}
                  wrapperCol={{ span: 24 }}
                >
                  <Input
                    placeholder={i18n.formatMessage({
                      id: "bigdata.components.RightMenu.Scheduling.Parameter.val.placeholder",
                    })}
                  />
                </Form.Item>
                <span className={styles.span} onClick={() => remove(name)}>
                  <a>{i18n.formatMessage({ id: "delete" })}</a>
                </span>
              </div>
            ))}
          </>
        )}
      </Form.List>
    </div>
  );
};
export default Parameter;
