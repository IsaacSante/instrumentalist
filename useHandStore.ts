import { create } from "zustand";

interface Point {
  x: number;
  y: number;
}

interface FingerState {
  index: Point;
  thumb: Point;
  previousIndex: Point;
  lastIndexUpdate: number;
}

interface HandsState {
  leftFingers: FingerState;
  rightFingers: FingerState;
  fingersTouching: { left: boolean; right: boolean };
  indexFingerVelocity: { left: number; right: number };
}

interface StoreActions {
  setFingerState: (
    hand: "leftFingers" | "rightFingers",
    newState: Partial<FingerState>
  ) => void;
}

const calculateDistance = (pointA: Point, pointB: Point): number => {
  return Math.sqrt(
    Math.pow(pointA.x - pointB.x, 2) + Math.pow(pointA.y - pointB.y, 2)
  );
};

const calculateVelocity = (
  current: Point,
  previous: Point,
  deltaTime: number
): number => {
  if (!previous || deltaTime === 0) {
    return 0;
  }
  const distance = calculateDistance(current, previous);
  return distance / deltaTime; // pixels per millisecond
};

export const useHandStore = create<HandsState & StoreActions>()((set) => ({
  leftFingers: {
    index: { x: 0, y: 0 },
    thumb: { x: 0, y: 0 },
    previousIndex: { x: 0, y: 0 },
    lastIndexUpdate: Date.now(),
  },
  rightFingers: {
    index: { x: 0, y: 0 },
    thumb: { x: 0, y: 0 },
    previousIndex: { x: 0, y: 0 },
    lastIndexUpdate: Date.now(),
  },
  fingersTouching: { left: false, right: false },
  indexFingerVelocity: { left: 0, right: 0 },

  setFingerState: (hand, newState) =>
    set((state) => {
      const handData = state[hand];
      const currentTime = Date.now();
      const deltaTime = (currentTime - handData.lastIndexUpdate) / 1000; // time in seconds

      const newFingers: FingerState = {
        ...handData,
        ...newState,
        lastIndexUpdate: currentTime,
      };
      const distance = calculateDistance(newFingers.index, newFingers.thumb);
      const touching = distance < 50;
      const velocity = calculateVelocity(
        newFingers.index,
        handData.previousIndex,
        deltaTime
      );

      return {
        [hand]: {
          ...newFingers,
          previousIndex: newState.index || handData.index,
        },
        fingersTouching: {
          ...state.fingersTouching,
          [hand === "leftFingers" ? "left" : "right"]: touching,
        },
        indexFingerVelocity: {
          ...state.indexFingerVelocity,
          [hand === "leftFingers" ? "left" : "right"]: velocity,
        },
      };
    }),
}));
