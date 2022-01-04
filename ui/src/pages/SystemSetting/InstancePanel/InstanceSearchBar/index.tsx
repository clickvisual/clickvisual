import instanceSearchBarStyles from '@/pages/SystemSetting/InstancePanel/InstanceSearchBar/index.less';
import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useContext } from 'react';
import { InstancePanelContext } from '@/pages/SystemSetting/InstancePanel';

type InstanceSearchBarProps = {};

const InstanceSearchBar = (props: InstanceSearchBarProps) => {
  const { onChangeVisible } = useContext(InstancePanelContext);
  return (
    <div className={instanceSearchBarStyles.instanceSearchBarMain}>
      <Button
        onClick={() => {
          if (onChangeVisible) onChangeVisible(true);
        }}
        icon={<PlusOutlined />}
        type={'primary'}
      >
        新增实例
      </Button>
    </div>
  );
};
export default InstanceSearchBar;
