import { Tooltip } from 'antd';
import SearchBarToolTip from '@/pages/DataLogs/components/SearchBar/SearchBarToolTip';
import { QuestionCircleFilled } from '@ant-design/icons';

const SearchBarSuffixIcon = () => {
  return (
    <Tooltip
      title={<SearchBarToolTip />}
      color={'#fff'}
      overlayInnerStyle={{
        padding: '8px 16px',
        width: 300,
        color: '#41464beb',
        fontSize: 12,
        lineHeight: '24px',
      }}
    >
      <QuestionCircleFilled size={32} />
    </Tooltip>
  );
};
export default SearchBarSuffixIcon;
