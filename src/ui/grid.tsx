import type { ReactNode } from 'react';
import { View } from 'react-native';

import { layout } from './tokens';

/** 3-column tile grid: 14 px column gap, 18 px row gap (design/screens/02-folder.html). */
export function Grid<T>({ items, render, columns = 3, rowGap = layout.gridRowGap }: { items: T[]; render: (item: T) => ReactNode; columns?: number; rowGap?: number }) {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns));
  return (
    <View style={{ gap: rowGap }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: layout.gridGap }}>
          {row.map((item, i) => (
            <View key={i} style={{ flex: 1 }}>
              {render(item)}
            </View>
          ))}
          {Array.from({ length: columns - row.length }, (_, i) => (
            <View key={`pad-${i}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}
