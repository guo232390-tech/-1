import { Vector3 } from 'three';

export type AppMode = 'TREE' | 'GALAXY' | 'FOCUS';

export type HandGesture = 'NONE' | 'FIST' | 'OPEN_PALM';

export interface ParticleProp {
  position: Vector3;
  color: string;
  size: number;
}

export interface ConstellationPoint {
  x: number;
  y: number;
  z: number;
}

export interface StarConnection {
  start: number; // index of start point
  end: number;   // index of end point
}

export interface PhotoData {
  id: number;
  url: string; // Using placeholder colors or external placeholder services
  title: string;
}