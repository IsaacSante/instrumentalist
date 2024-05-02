export type HandTrackingProps = {
  isMobile: boolean;
};

export type Handedness = {
  score: number;
  index: number;
  categoryName: string;
  displayName: "Left" | "Right";
};

export type HandednessArray = Handedness[][];

export type Landmark = {
  x: number;
  y: number;
  z: number;
};

export type Landmarks = Landmark[];
