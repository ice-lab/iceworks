import * as React from 'react';
import { IMaterialBase } from '@iceworks/material/lib/common';
import * as styles from './base.module.scss';

export const MaterialBase: React.FC<{
  dataSource: IMaterialBase,
  onClick?(dataSource: IMaterialBase): void,
}> = ({ dataSource, onClick }) => {
  function handleClick() {
    onClick && onClick(dataSource);
  }

  return (
    <div className={styles.container}>
      <div onClick={handleClick}>
        <h5 className={styles.title}>{dataSource.name}</h5>
        <p className={styles.desc}>{dataSource.title || dataSource.name}</p>
      </div>
      <div className={styles.actions}>
        <a
          href={dataSource.homepage}
          rel="noopener noreferrer"
          target="_blank"
          className={styles.button}
        >
          Docunment
        </a>
        <a
          className={styles.button}
          rel="noopener noreferrer"
          target="_blank"
          href={dataSource.repository}
        >
          Code
        </a>
      </div>
    </div>
  );
};
