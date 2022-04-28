import React from 'react';
import { Button, Col, Form, Row, Space } from 'antd';
import { FormInstance, FormProps } from 'antd/es/form';
import CollapseX from '../CollapseX';

interface SearchFormLayoutProps extends FormProps {
  form: FormInstance;
  fields: {
    title: string;
    name: string;
    input: React.ReactElement;
  }[];
  showCollapse?: boolean;
  actions?: React.ReactElement[];
}

const SearchFormLayout = (props: SearchFormLayoutProps) => {
  const { form, fields, showCollapse, actions, ...restProps } = props;
  const formColProps = {
    xxl: 6,
    lg: 8,
    md: 12,
    sm: 24,
  };

  const handleReset = () => {
    form.resetFields();
    form.submit();
  };

  const renderFormFields = () => {
    return (
      <Row gutter={24}>
        {fields.map(field => (
          <Col {...formColProps} key={field.name}>
            <Form.Item name={field.name} label={field.title}>
              {field.input}
            </Form.Item>
          </Col>
        ))}
      </Row>
    );
  };

  return (
    <Form form={form} {...restProps}>
      {showCollapse ? (
        <CollapseX showHeight={85}>{renderFormFields()}</CollapseX>
      ) : (
        renderFormFields()
      )}
      <div style={{ textAlign: 'right' }}>
        <Space>
          {actions}
          <Button htmlType="submit" type="primary">
            查询
          </Button>
          <Button onClick={handleReset}>重置</Button>
        </Space>
      </div>
    </Form>
  );
};

export default SearchFormLayout;
