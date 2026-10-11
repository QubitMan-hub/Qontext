import React from "react";
import type { SceneTiming } from "../clock";
import script from "../script.json";
import { Placeholder } from "./Placeholder";

type SceneComponent = React.FC<{ scene: SceneTiming }>;
const titled = (title: string): SceneComponent => {
  const Titled: SceneComponent = ({ scene }) => React.createElement(Placeholder, { scene, title });
  return Titled;
};

/** Every scene, by id. Scenes not yet drawn show their chapter title. */
export const SCENES: Record<string, SceneComponent> = Object.fromEntries(script.scenes.map((s) => [s.id, titled(s.chapter)]));
