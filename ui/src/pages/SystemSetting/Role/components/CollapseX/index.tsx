import React, { useState } from 'react';
import { Button } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import styles from './index.less';

interface CollapseX {
  children: React.ReactNode;

  // 展示的高度(px)
  showHeight: number;
}

const CollapseX = (props: CollapseX) => {
  const { showHeight } = props;
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div>
      <div
        className={styles.container}
        style={{ maxHeight: collapsed ? `${showHeight}px` : 'fit-content' }}
      >
        {props.children}

        {collapsed && <div className={styles.mask} />}
      </div>
      <div className={styles.collapseBtn}>
        {collapsed ? (
          <Button type="link" size="small" onClick={() => setCollapsed(false)}>
            展开 <ArrowDownOutlined />
          </Button>
        ) : (
          <Button type="link" size="small" onClick={() => setCollapsed(true)}>
            收起 <ArrowUpOutlined />
          </Button>
        )}
      </div>
    </div>
  );
};

export default CollapseX;
