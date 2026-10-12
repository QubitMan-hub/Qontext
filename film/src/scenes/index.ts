import React from "react";
import type { SceneTiming } from "../clock";
import script from "../script.json";
import { Placeholder } from "./Placeholder";
import { Hook } from "./Hook";
import { Idea } from "./Idea";
import { Dare } from "./Dare";
import { Rooms } from "./Rooms";
import { PhaseDial } from "./PhaseDial";
import { ObserverSuperpose } from "./ObserverSuperpose";
import { ProbeNotary } from "./ProbeNotary";
import { Outro } from "./Outro";
import { World } from "./World";
import { Atelier } from "./Atelier";

type SceneComponent = React.FC<{ scene: SceneTiming }>;
const titled = (title: string): SceneComponent => {
  const Titled: SceneComponent = ({ scene }) => React.createElement(Placeholder, { scene, title });
  return Titled;
};

const DRAWN: Record<string, SceneComponent> = { hook: Hook, idea: Idea, dare: Dare, world: World, rooms: Rooms, atelier: Atelier, phase: PhaseDial, observer: ObserverSuperpose, probe: ProbeNotary, outro: Outro };

/** Every scene, by id. Scenes not yet drawn show their chapter title. */
export const SCENES: Record<string, SceneComponent> = Object.fromEntries(script.scenes.map((s) => [s.id, DRAWN[s.id] ?? titled(s.chapter)]));
