import clusterPanelStyles from '@/pages/SystemSetting/ClustersPanel/index.less';
import { Button, Input } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useContext } from 'react';
import { ClustersPanelContext } from '@/pages/SystemSetting/ClustersPanel';
// import { useDebounceFn } from 'ahooks';

type ClustersSearchBarProps = {};
const ClustersSearchBar = (props: ClustersSearchBarProps) => {
  const { onChangeVisible } = useContext(ClustersPanelContext);
  // const handleSearch = useDebounceFn(() => {}, { wait: 500 });
  return (
    <div className={clusterPanelStyles.searchBar}>
      {/*<div className={clusterPanelStyles.input}>*/}
      {/*  <span className={clusterPanelStyles.label}>名称：</span>*/}
      {/*  <div className={clusterPanelStyles.query}>*/}
      {/*    <Input />*/}
      {/*  </div>*/}
      {/*</div>*/}
      {/*<div className={clusterPanelStyles.searchBtn}>*/}
      {/*<Button onClick={handleSearch.run} icon={<SearchOutlined />} type={'primary'}>*/}
      {/*  查询*/}
      {/*</Button>*/}
      <Button
        onClick={() => {
          if (onChangeVisible) onChangeVisible(true);
        }}
        icon={<PlusOutlined />}
        type={'primary'}
      >
        新增集群
      </Button>
      {/*</div>*/}
    </div>
  );
};

export default ClustersSearchBar;
