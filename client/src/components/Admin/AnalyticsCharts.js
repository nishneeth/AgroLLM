import React, { useState } from 'react';
import styles from './AnalyticsCharts.module.css';

export const LineChart = ({ data, title, color = '#10b981' }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!data || data.length === 0) {
    return <div className={styles.emptyChart}>No data available</div>;
  }

  const maxValue = Math.max(...data.map(d => d.count), 1);
  const width = 100;
  const height = 60;
  const padding = 5;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (width - 2 * padding) + padding;
    const y = height - padding - ((d.count / maxValue) * (height - 2 * padding));
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className={styles.chartContainer}>
      <h3 className={styles.chartTitle}>{title}</h3>
      <div style={{ position: 'relative' }}>
        <svg viewBox={`0 0 ${width} ${height}`} className={styles.svg}>
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="2"
          />
          {data.map((d, i) => {
            const x = (i / (data.length - 1)) * (width - 2 * padding) + padding;
            const y = height - padding - ((d.count / maxValue) * (height - 2 * padding));
            return (
              <g key={i}>
                <circle
                  cx={x}
                  cy={y}
                  r="2"
                  fill={color}
                />
                {/* Invisible larger circle for better hover detection */}
                <circle
                  cx={x}
                  cy={y}
                  r="4"
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredPoint({ index: i, data: d, x, y })}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              </g>
            );
          })}
        </svg>
        {/* Tooltip */}
        {hoveredPoint && (
          <div
            className={styles.tooltip}
            style={{
              left: `${hoveredPoint.x}%`,
              top: `${hoveredPoint.y}%`,
            }}
          >
            <div className={styles.tooltipContent}>
              <strong>{hoveredPoint.data.period}</strong>
              <div>{hoveredPoint.data.count} {hoveredPoint.data.count === 1 ? 'chat' : 'chats'}</div>
            </div>
          </div>
        )}
      </div>
      <div className={styles.chartLabels}>
        <span>{data[0]?.period}</span>
        <span>{data[Math.floor(data.length / 2)]?.period}</span>
        <span>{data[data.length - 1]?.period}</span>
      </div>
    </div>
  );
};

export const BarChart = ({ data, title, color = '#3b82f6' }) => {
  if (!data || data.length === 0) {
    return <div className={styles.emptyChart}>No data available</div>;
  }

  const maxValue = Math.max(...data.map(d => d.count), 1);
  
  // Language code to name mapping
  const languageNames = {
    'en': 'English',
    'te': 'Telugu',
    'hi': 'Hindi',
  };

  return (
    <div className={styles.chartContainer}>
      <h3 className={styles.chartTitle}>{title}</h3>
      <div className={styles.barChart}>
        {data.map((item, i) => {
          const displayLabel = item.language 
            ? (languageNames[item.language] || item.language)
            : item.topic;
          
          return (
            <div key={i} className={styles.barItem}>
              <div className={styles.barLabel}>{displayLabel}</div>
              <div className={styles.barWrapper}>
                <div
                  className={styles.bar}
                  style={{
                    width: `${(item.count / maxValue) * 100}%`,
                    backgroundColor: color
                  }}
                >
                  <span className={styles.barValue}>{item.count}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const PieChart = ({ data, title }) => {
  if (!data || (data.positive === 0 && data.negative === 0)) {
    return <div className={styles.emptyChart}>No data available</div>;
  }

  const total = data.positive + data.negative;
  const positivePercent = ((data.positive / total) * 100).toFixed(1);
  const negativePercent = ((data.negative / total) * 100).toFixed(1);

  return (
    <div className={styles.chartContainer}>
      <h3 className={styles.chartTitle}>{title}</h3>
      <div className={styles.pieChart}>
        <div className={styles.pieStats}>
          <div className={styles.statItem}>
            <div className={styles.statDot} style={{ backgroundColor: '#10b981' }}></div>
            <span>Positive: {data.positive} ({positivePercent}%)</span>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statDot} style={{ backgroundColor: '#ef4444' }}></div>
            <span>Negative: {data.negative} ({negativePercent}%)</span>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statDot} style={{ backgroundColor: '#3b82f6' }}></div>
            <span>Satisfaction Rate: {data.rate}%</span>
          </div>
        </div>
        <div className={styles.pieVisual}>
          <svg viewBox="0 0 100 100" className={styles.pieSvg}>
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#ef4444"
              strokeWidth="20"
              strokeDasharray={`${(data.negative / total) * 251.2} 251.2`}
              transform="rotate(-90 50 50)"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#10b981"
              strokeWidth="20"
              strokeDasharray={`${(data.positive / total) * 251.2} 251.2`}
              strokeDashoffset={`-${(data.negative / total) * 251.2}`}
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div className={styles.pieCenter}>
            <div className={styles.pieCenterValue}>{data.rate}%</div>
            <div className={styles.pieCenterLabel}>Satisfaction</div>
          </div>
        </div>
      </div>
    </div>
  );
};
