import { getPatternConfig, PatternKind, PatternPalette } from "@/utils/patternSeed";
import React, { useMemo } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Polygon,
  Rect,
  Stop,
} from "react-native-svg";

/**
 * Seeded generative artwork used wherever a card or avatar needs a picture.
 *
 * Every pattern tiles evenly across the square viewBox so it still reads well
 * when the box is cropped to a wide banner or a circular avatar.
 */

const SIZE = 200;

type Builder = (
  random: () => number,
  palette: PatternPalette,
) => React.ReactNode[];

const grid: Builder = (random, palette) => {
  const step = 20 + Math.floor(random() * 3) * 5;
  const marks: React.ReactNode[] = [];

  for (let offset = step; offset < SIZE; offset += step) {
    marks.push(
      <Line
        key={`v${offset}`}
        x1={offset}
        y1={0}
        x2={offset}
        y2={SIZE}
        stroke={palette.ink}
        strokeWidth={1}
        opacity={0.35}
      />,
      <Line
        key={`h${offset}`}
        x1={0}
        y1={offset}
        x2={SIZE}
        y2={offset}
        stroke={palette.ink}
        strokeWidth={1}
        opacity={0.35}
      />,
    );
  }

  for (let x = 0; x < SIZE; x += step) {
    for (let y = 0; y < SIZE; y += step) {
      if (random() > 0.82) {
        marks.push(
          <Rect
            key={`c${x}-${y}`}
            x={x}
            y={y}
            width={step}
            height={step}
            fill={palette.accent}
            opacity={0.5}
          />,
        );
      }
    }
  }

  return marks;
};

const arcs: Builder = (random, palette) => {
  const cell = 40;
  const marks: React.ReactNode[] = [];

  for (let x = 0; x < SIZE; x += cell) {
    for (let y = 0; y < SIZE; y += cell) {
      const half = cell / 2;
      const flipped = random() > 0.5;

      const first = flipped
        ? `M ${x} ${y + half} A ${half} ${half} 0 0 0 ${x + half} ${y + cell}`
        : `M ${x} ${y + half} A ${half} ${half} 0 0 1 ${x + half} ${y}`;
      const second = flipped
        ? `M ${x + half} ${y} A ${half} ${half} 0 0 0 ${x + cell} ${y + half}`
        : `M ${x + half} ${y + cell} A ${half} ${half} 0 0 1 ${x + cell} ${y + half}`;

      marks.push(
        <Path
          key={`a${x}-${y}`}
          d={first}
          stroke={palette.ink}
          strokeWidth={3}
          fill="none"
          opacity={0.7}
        />,
        <Path
          key={`b${x}-${y}`}
          d={second}
          stroke={palette.accent}
          strokeWidth={3}
          fill="none"
          opacity={0.7}
        />,
      );
    }
  }

  return marks;
};

const waves: Builder = (random, palette) => {
  const marks: React.ReactNode[] = [];
  const amplitude = 8 + random() * 8;
  const gap = 18 + random() * 8;

  for (let y = -gap, index = 0; y < SIZE + gap; y += gap, index++) {
    let d = `M 0 ${y}`;
    for (let x = 0; x < SIZE; x += 25) {
      const lift = index % 2 === 0 ? -amplitude : amplitude;
      d += ` Q ${x + 12.5} ${y + lift} ${x + 25} ${y}`;
    }

    marks.push(
      <Path
        key={`w${index}`}
        d={d}
        stroke={index % 3 === 0 ? palette.accent : palette.ink}
        strokeWidth={index % 3 === 0 ? 3 : 1.5}
        fill="none"
        opacity={0.65}
      />,
    );
  }

  return marks;
};

const triangles: Builder = (random, palette) => {
  const marks: React.ReactNode[] = [];
  const width = 40;
  const height = 34;

  for (let row = 0, y = 0; y < SIZE + height; y += height, row++) {
    const shift = row % 2 === 0 ? 0 : width / 2;

    for (let x = -width; x < SIZE + width; x += width) {
      const up = random() > 0.45;
      const points = up
        ? `${x + shift},${y + height} ${x + shift + width / 2},${y} ${x + shift + width},${y + height}`
        : `${x + shift},${y} ${x + shift + width},${y} ${x + shift + width / 2},${y + height}`;

      marks.push(
        <Polygon
          key={`t${x}-${y}`}
          points={points}
          fill={random() > 0.5 ? palette.ink : palette.accent}
          opacity={0.18 + random() * 0.35}
        />,
      );
    }
  }

  return marks;
};

const confetti: Builder = (random, palette) => {
  const marks: React.ReactNode[] = [];

  for (let i = 0; i < 70; i++) {
    const x = random() * SIZE;
    const y = random() * SIZE;
    const color = random() > 0.5 ? palette.ink : palette.accent;
    const opacity = 0.3 + random() * 0.55;

    if (random() > 0.55) {
      marks.push(
        <Circle
          key={`d${i}`}
          cx={x}
          cy={y}
          r={1.5 + random() * 3.5}
          fill={color}
          opacity={opacity}
        />,
      );
    } else {
      const length = 6 + random() * 12;
      marks.push(
        <G key={`s${i}`} transform={`rotate(${random() * 180} ${x} ${y})`}>
          <Rect
            x={x}
            y={y}
            width={length}
            height={2.5}
            rx={1.25}
            fill={color}
            opacity={opacity}
          />
        </G>,
      );
    }
  }

  return marks;
};

const rings: Builder = (random, palette) => {
  const marks: React.ReactNode[] = [];
  const cell = 50;

  for (let x = cell / 2; x < SIZE; x += cell) {
    for (let y = cell / 2; y < SIZE; y += cell) {
      const count = 2 + Math.floor(random() * 3);

      for (let ring = 0; ring < count; ring++) {
        marks.push(
          <Circle
            key={`r${x}-${y}-${ring}`}
            cx={x}
            cy={y}
            r={6 + ring * 8}
            stroke={ring % 2 === 0 ? palette.ink : palette.accent}
            strokeWidth={2}
            fill="none"
            opacity={0.6}
          />,
        );
      }
    }
  }

  return marks;
};

const diagonals: Builder = (random, palette) => {
  const marks: React.ReactNode[] = [];
  const gap = 16 + random() * 10;

  for (let offset = -SIZE, index = 0; offset < SIZE * 2; offset += gap, index++) {
    marks.push(
      <Line
        key={`dg${index}`}
        x1={offset}
        y1={0}
        x2={offset + SIZE}
        y2={SIZE}
        stroke={index % 4 === 0 ? palette.accent : palette.ink}
        strokeWidth={index % 4 === 0 ? 8 : 3}
        opacity={index % 4 === 0 ? 0.55 : 0.35}
      />,
    );
  }

  return marks;
};

const bauhaus: Builder = (random, palette) => {
  const marks: React.ReactNode[] = [];
  const cell = 50;

  for (let x = 0; x < SIZE; x += cell) {
    for (let y = 0; y < SIZE; y += cell) {
      const color = random() > 0.5 ? palette.ink : palette.accent;
      const opacity = 0.45 + random() * 0.4;
      const roll = random();
      const rotation = Math.floor(random() * 4) * 90;
      const key = `bh${x}-${y}`;

      if (roll < 0.3) {
        marks.push(
          <Circle
            key={key}
            cx={x + cell / 2}
            cy={y + cell / 2}
            r={cell / 2.6}
            fill={color}
            opacity={opacity}
          />,
        );
      } else if (roll < 0.6) {
        // Quarter disc pinned to one corner of the cell.
        marks.push(
          <G
            key={key}
            transform={`rotate(${rotation} ${x + cell / 2} ${y + cell / 2})`}
          >
            <Path
              d={`M ${x} ${y} L ${x + cell} ${y} A ${cell} ${cell} 0 0 1 ${x} ${y + cell} Z`}
              fill={color}
              opacity={opacity}
            />
          </G>,
        );
      } else if (roll < 0.8) {
        marks.push(
          <G
            key={key}
            transform={`rotate(${rotation} ${x + cell / 2} ${y + cell / 2})`}
          >
            <Rect
              x={x}
              y={y}
              width={cell}
              height={cell / 2}
              fill={color}
              opacity={opacity}
            />
          </G>,
        );
      } else {
        marks.push(
          <Circle
            key={key}
            cx={x + cell / 2}
            cy={y + cell / 2}
            r={cell / 3}
            stroke={color}
            strokeWidth={4}
            fill="none"
            opacity={opacity}
          />,
        );
      }
    }
  }

  return marks;
};

const BUILDERS: Record<PatternKind, Builder> = {
  grid,
  arcs,
  waves,
  triangles,
  confetti,
  rings,
  diagonals,
  bauhaus,
};

type PatternArtProps = {
  /** Stable value (an id, an email) that decides which artwork is drawn. */
  seed: string;
  /** Force a specific pattern instead of deriving one from the seed. */
  kind?: PatternKind;
  style?: StyleProp<ViewStyle>;
  className?: string;
};

export const PatternArt = ({ seed, kind, style, className }: PatternArtProps) => {
  const { gradientId, marks, palette } = useMemo(() => {
    const config = getPatternConfig(seed, kind);
    return {
      gradientId: `pattern-${config.kind}-${seed || "default"}`,
      marks: BUILDERS[config.kind](config.random, config.palette),
      palette: config.palette,
    };
  }, [seed, kind]);

  return (
    <View style={style} className={className}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={palette.background[0]} />
            <Stop offset="1" stopColor={palette.background[1]} />
          </LinearGradient>
        </Defs>
        <Rect
          x={0}
          y={0}
          width={SIZE}
          height={SIZE}
          fill={`url(#${gradientId})`}
        />
        {marks}
      </Svg>
    </View>
  );
};

export default PatternArt;
