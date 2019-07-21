// Import stylesheets
import './style.css';
import { Subject, merge, fromEvent, BehaviorSubject, of, defer, concat, pipe } from 'rxjs';
import { scan, shareReplay, tap, withLatestFrom, pluck, distinctUntilChanged, startWith, mapTo, map, concatMap, filter, mergeMap } from 'rxjs/operators';

const appDiv: HTMLElement = document.getElementById('app');
const incrementButton: HTMLElement = document.getElementById('increment');
const decrementButton: HTMLElement = document.getElementById('decrement');
const resetButton: HTMLElement = document.getElementById('reset');

const reducer = (state, action) => {
  switch (action.type) {
    case 'INCREMENT': {
      return { ...state, count: state.count + 1 };
    }
    case 'DECREMENT': {
      return { ...state, count: state.count - 1 };
    }
    case 'RESET': {
      return { ...state, count: 0 };
    }
    case 'COUNT': {
      return { ...state, count: action.count };
    }
    default: {
      return state;
    }
  }
}

const initialState = { count: 5 };

const stateSubject = new BehaviorSubject(initialState);
const actionSubject = new Subject();
const effectSubject = new Subject();

const alertOnZero$ = (action) => {
  return of(action).pipe(
    filter((action: any) => action.type === 'RESET'),
    map(() => Number(prompt('Reset called: Set new count'))),
    map((count: number) => ({ type: 'COUNT', count }))
  );
};

const effect$ = effectSubject.asObservable().pipe(
  mergeMap((action) => merge(alertOnZero$(action))),
  tap(a => actionSubject.next(a))
);

const action$ = actionSubject.asObservable().pipe(
  concatMap((action) =>
    concat(
      of(action).pipe(
        withLatestFrom(stateSubject),
        map(([action, state]) => reducer(state, action)),
        tap(a => stateSubject.next(a))
      ),
      of(action).pipe(
        tap(a => effectSubject.next(a))
      )
    )
  )
);

const state$ = stateSubject.asObservable();

const getCountSelector$ = state$.pipe(
  pluck('count'),
  distinctUntilChanged()
);

const increment$ = fromEvent(incrementButton, 'click')
  .pipe(mapTo({ type: 'INCREMENT' }));
const decrement$ = fromEvent(decrementButton, 'click')
  .pipe(mapTo({ type: 'DECREMENT' }));
const reset$ = fromEvent(resetButton, 'click')
  .pipe(mapTo({ type: 'RESET' }));

const actionTrigger$ = merge(
  increment$,
  decrement$,
  reset$,
).pipe(tap(actionSubject));

const displayCount$ = getCountSelector$.pipe(
  tap((count: number) => appDiv.innerHTML = `count: ${count}`)
);

merge(actionTrigger$, displayCount$, action$, effect$).subscribe();