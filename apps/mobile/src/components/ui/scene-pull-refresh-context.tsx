import { createContext, useContext } from 'react';

type ScenePullRefreshSetter = (visible: boolean) => void;

const noop: ScenePullRefreshSetter = () => {};

export const ScenePullRefreshContext = createContext<ScenePullRefreshSetter>(noop);

export function useScenePullRefreshSetter(): ScenePullRefreshSetter {
  return useContext(ScenePullRefreshContext);
}
