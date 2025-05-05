import { pick } from 'radash';
import { useRef } from 'react';
import { shallow } from 'zustand/shallow';

type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

type Many<T> = T | readonly T[];

export default function useSelector<S extends object, P extends keyof S>(
  paths: Many<P>
): (state: S) => Pick<S, P> {
  const prev = useRef<Pick<S, P>>({} as Pick<S, P>);

  return (state: S) => {
    if (state) {
      const next = pick(state, paths as any);
      return shallow(prev.current, next) ? prev.current : (prev.current = next);
    }
    return prev.current;
  };
}
