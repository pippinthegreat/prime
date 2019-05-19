import { PrimeFieldProps, SchemaVariant } from '@primecms/field';
import { Form, Select, Switch } from 'antd';
import React from 'react';

type Props = PrimeFieldProps & {
  options: {
    multiple?: boolean;
  };
};

interface IContentType {
  id: string;
  title: string;
  variant?: SchemaVariant;
}

export class SchemaSettingsComponent extends React.PureComponent<Props> {
  public render() {
    const { form, stores, options } = this.props;

    return (
      <>
        <Form.Item label="Slices" style={{ marginBottom: 8 }}>
          {form.getFieldDecorator('options.schemaIds')(
            <Select placeholder="Select Slices" mode="multiple">
              {stores.ContentTypes.list
                .filter((n: any) => n.variant === 'Slice')
                .map((contentType: IContentType) => (
                  <Select.Option value={contentType.id} key={contentType.id}>
                    {contentType.title}
                  </Select.Option>
                ))}
            </Select>
          )}
        </Form.Item>
        <Form.Item label="Options" style={{ marginBottom: -8 }} />
        <Form.Item>
          {form.getFieldDecorator('options.multiple', {
            valuePropName: 'checked',
            initialValue: options.multiple,
          })(<Switch />)}
          <label htmlFor="options.multiple" style={{ marginLeft: 8 }}>
            Allow multiple slices
          </label>
        </Form.Item>
      </>
    );
  }
}
