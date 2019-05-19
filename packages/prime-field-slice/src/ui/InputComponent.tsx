import { PrimeFieldProps } from '@primecms/field';
import { Button, Card, Dropdown, Icon, Menu, Popconfirm } from 'antd';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { get } from 'lodash';
import React from 'react';

type ISlice = null | {
  __inputtype: string;
  __uuid: string;
  id: string;
  title: string;
  fields: any;
};

interface IState {
  contentTypes: any[];
  slices: ISlice[];
}

const randomByte = () => {
  const seq = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
  return seq.substr(seq.length - 1, 1);
};
const randomBytes = length =>
  Array.from({ length })
    .map(randomByte)
    .join('');
const randomUuid = () => [8, 4, 4, 4, 12].map(randomBytes).join('-');

const { uuid = { v4: randomUuid } } = window as any;

const highlightColor = '#FEFCDD';

function noChildren(field: any, index: number, allFields: any) {
  return !allFields.find((allFieldsField: any) => {
    if (allFieldsField.id !== field.id && allFieldsField.fields) {
      return allFieldsField.fields.find((innerField: any) => innerField.id === field.id);
    }

    return false;
  });
}

const reorder = (list: ISlice[], startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

const getCardStyle = isDragging => ({
  border: isDragging && '2px solid #1890ff',
  borderRadius: 3,
});

const getItemStyle = (isDragging, draggableStyle) => ({
  userSelect: 'none',
  marginBottom: 16,
  ...draggableStyle,
});

const getListStyle = isDraggingOver => ({
  transition: 'background-color 0.3s ease-in-out',
  backgroundColor: isDraggingOver ? highlightColor : '',
  padding: 16,
});

export class InputComponent extends React.Component<PrimeFieldProps, IState> {
  public state: IState = {
    contentTypes: [],
    slices: [],
  };

  public values: any = [];

  public componentDidMount() {
    this.load().catch((err: Error) => {
      console.error(err); // tslint:disable-line no-console
    });
  }

  public componentWillReceiveProps(nextProps: any) {
    if (JSON.stringify(this.props.initialValue) !== JSON.stringify(nextProps.initialValue)) {
      this.setState({
        slices: []
          .concat(nextProps.initialValue || [])
          .map((n: { __inputname: string; __uuid: string }, index: number) => ({
            ...this.props.stores.ContentTypes.items.get(n.__inputname),
            __uuid: n.__uuid,
            index,
          })),
      });
    }
  }

  public async load() {
    const { field, stores } = this.props;
    const ids = get(field.options, 'schemaIds', []);
    const initialValue = (this.props.initialValue as any) || [];

    this.setState({
      contentTypes: stores.ContentTypes.list.filter((n: { id: string }) => ids.indexOf(n.id) >= 0),
      slices: initialValue.map((n: { __inputname: string; __uuid: string }, index: number) => ({
        ...stores.ContentTypes.items.get(n.__inputname),
        __uuid: n.__uuid,
        index,
      })),
    });
  }

  public onRemoveClick = uuid => {
    const slices = this.state.slices.filter(s => s!.__uuid !== uuid);
    this.setState({ slices });
  };

  public onMenuClick = async (e: { key: string }) => {
    const item = this.props.stores.ContentTypes.items.get(e.key);
    const slices = this.state.slices.slice(0);
    slices.push({
      ...item,
      index: slices.length,
      __uuid: uuid.v4(),
    });
    this.setState({ slices });
  };

  public onDragEnd = result => {
    // dropped outside the list
    if (!result.destination) {
      return;
    }

    const slices: ISlice[] = reorder(
      this.state.slices,
      result.source.index,
      result.destination.index
    );

    this.setState({
      slices,
    });
  };

  public renderField = (field: any, uuid: string) => {
    const initialValue = (this.props.initialValue as any) || [];
    const hasInitial = initialValue.find(v => v.__uuid === uuid);

    return this.props.renderField({
      ...this.props,
      field,
      initialValue: hasInitial ? hasInitial[field.name] : '',
      path: `${this.props.path}.${uuid}.${field.name}`,
    } as any);
  };

  public render() {
    const { field, form, path } = this.props;
    const menu = (
      <Menu onClick={this.onMenuClick}>
        {this.state.contentTypes.map(item => (
          <Menu.Item key={item.id}>{item.title}</Menu.Item>
        ))}
      </Menu>
    );

    return (
      <div className="prime-slice">
        <div className="prime-slice-spacer-top" />
        <div className="ant-form-item-label">
          <label title={field.title}>{field.title}</label>
        </div>
        <DragDropContext onDragEnd={this.onDragEnd}>
          <Droppable droppableId={field.id}>
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                style={getListStyle(snapshot.isDraggingOver)}
              >
                {this.state.slices.map((slice, idx) => {
                  if (!slice || !slice.id) {
                    return null;
                  }
                  const { __uuid: uuid } = slice as any;

                  return (
                    <Draggable
                      key={`${slice.id}_${uuid}`}
                      draggableId={`${slice.id}_${uuid}`}
                      index={idx}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          style={getItemStyle(snapshot.isDragging, provided.draggableProps.style)}
                        >
                          <Card
                            className="prime-slice-item"
                            bodyStyle={getCardStyle(snapshot.isDragging)}
                          >
                            <div className="prime-slice-item-actions">
                              <div className="prime-slice-item-button-holder">
                                <Popconfirm
                                  title="Are you sure?"
                                  icon={<Icon type="question-circle-o" style={{ color: 'red' }} />}
                                  onConfirm={() => this.onRemoveClick(uuid)}
                                >
                                  <Icon className="prime-slice-item-button" type="delete" />
                                </Popconfirm>
                              </div>
                              <div
                                className="prime-slice-item-button-holder"
                                {...provided.dragHandleProps}
                              >
                                <Icon className={`prime-slice-item-button`} type="drag" />
                              </div>
                            </div>
                            {form.getFieldDecorator(`${path}.${uuid}.__index`, {
                              initialValue: idx,
                            })(<input type="hidden" />)}
                            {form.getFieldDecorator(`${path}.${uuid}.__uuid`, {
                              initialValue: uuid,
                            })(<input type="hidden" />)}
                            {form.getFieldDecorator(`${path}.${uuid}.__inputname`, {
                              initialValue: slice.id,
                            })(<input type="hidden" />)}
                            {slice.fields.fields
                              .filter(noChildren)
                              .map((f: any) => this.renderField(f, uuid))}
                          </Card>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
        <div style={{ textAlign: 'center' }}>
          <Dropdown placement="bottomCenter" overlay={menu} trigger={['click']}>
            <Button
              size="large"
              shape="circle"
              // block={true}
              icon="plus"
              className="prime-slice-add"
            />
          </Dropdown>
        </div>
        <div className="prime-slice-spacer-bottom" />
      </div>
    );
  }
}
