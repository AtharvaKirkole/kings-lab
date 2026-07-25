/**
 * Loading screen shown while the dataset loads. Draws the 3pt arc from the real court constants and floats a ball along it
 */

import { CORNER_THREE_Y, HALF_LENGTH, HOOP_X, THREE_POINT_ARC_RADIUS } from '../../lib/court';
import styles from './LoadingScreen.module.css';

const ARC_AT_22 = HOOP_X + Math.sqrt(THREE_POINT_ARC_RADIUS ** 2 - CORNER_THREE_Y ** 2);

const ARC_PATH = `M ${-HALF_LENGTH},${-CORNER_THREE_Y}
  L ${ARC_AT_22},${-CORNER_THREE_Y}
  A ${THREE_POINT_ARC_RADIUS} ${THREE_POINT_ARC_RADIUS} 0 0 1 ${ARC_AT_22},${CORNER_THREE_Y}
  L ${-HALF_LENGTH},${CORNER_THREE_Y}`;

export function LoadingScreen({ message = 'Loading shot data' }: { message?: string }) {
  return (
    <div className={styles.screen} role="status" aria-live="polite">
      <div className={styles.stage}>
        <svg className={styles.court} viewBox="-48 -26 49 52" aria-hidden="true">
          <path d={ARC_PATH} className={styles.arc} />
          <circle cx={HOOP_X} cy={0} r={0.75} className={styles.rim} />
          <circle r={1.5} className={styles.ball}>
            <animateMotion dur="2.4s" repeatCount="indefinite" path={ARC_PATH} rotate="auto" />
          </circle>
        </svg>

        <div className={styles.copy}>
          <span className={styles.brand}>Kings</span>
          <span className={styles.title}>Shot Lab</span>
          <span className={styles.message}>{message}…</span>
        </div>
      </div>
    </div>
  );
}
