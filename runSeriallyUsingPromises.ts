import { CanActivateChildFn, CanActivateFn, UrlTree } from '@angular/router';
import { Observable, lastValueFrom, take } from 'rxjs';

export function runSeriallyWithPromisesAny(...guards: CanActivateFn[] | CanActivateChildFn[]): CanActivateFn | CanActivateChildFn {

    return (route, state) => {
        return new Promise(resolve => {

            const parseGuardsStartingAt = (index: number) => {
                if (index >= guards.length) {
                    resolve(true);
                    return;
                }

                for (index; index < guards.length; index++) {
                    const guard = guards[index];
                    const guardReturn = guard(route, state);

                    if (!guardReturn || guardReturn instanceof UrlTree) {
                        resolve(guardReturn);
                        return;

                    } else if (guardReturn instanceof Observable) {
                        lastValueFrom(guardReturn.pipe(take(1)))
                        .then(handleAsyncRes(index))
                        return;
                    } else if (guardReturn instanceof Promise) {
                        guardReturn.then(handleAsyncRes(index))
                        return;
                    }
                }

                resolve(true);
            }

            const handleAsyncRes = (currentIndex: number) => {
                return (res: Boolean | UrlTree) => {
                    if (!res || res instanceof UrlTree) {
                        resolve(res);
                    } else {
                        parseGuardsStartingAt(currentIndex+1);
                    }
                }
            }

            parseGuardsStartingAt(0);
        })
    }
}


// SEE A COMMENTED VERSION IMPLEMENTATION BELLOW TO BETTER UNDERSTAND IT.

/* This function will make sure all guards passed as arguments run syncronally, in the same order
 * with on guard running only after the last only has returned a value.
 * 
 * All guards will be evaluated as if they had been passed to `canActivate` or `canActivateChild`
 * directly and because of that the only difference between that scenario and using this function
 * is the assurance your each guard will wait the last one complete its execution.
 * 
 * As soon as a guard returns `false`, no other guard will be evaluated and the route won't activate.
 * As soon as a guard returns a UrlTree, no other guard will be evaluated and a redirection to the new
 * route will begin.
 * Only if all guards return `true` the route will be activated.
 * 
 * Returns a single "wrapper" guard that is equivalent to all other guards passed as argument. */
function _runSeriallyWithPromisesAny(...guards: CanActivateFn[] | CanActivateChildFn[]): CanActivateFn | CanActivateChildFn {

    // returns a "wrapper" guard that embeds all guards passed as arguments
    return (route, state) => {
        // this "wrapper" guard will return a Promise that resolves to a boolean or UrlTree
        // 1. Creates the Promise refered above.
        return new Promise(resolve => {
            // Creates a helper function that will parse guards from the `guards` array starting
            // at a certain index and futher on.
            const parseGuardsStartingAt = (index: number) => {
                // 1. if the index is beyond the length of `guards` array, this means there are no
                // guards left to parse, thus we resolve the Promise to `true` right away. 
                if (index >= guards.length) {
                    resolve(true);
                    // return is important throughout this helper function because just resolving
                    // the Promise won't stop it from executing. In this case specifically it wouldn't
                    // make much difference, but we end up saving a tiny tiny bit of processing power
                    // in taking this function out of the call stack earlier.
                    return;
                }

                // 2. Start looping through guards stating at `index`
                for (index; index < guards.length; index++) {
                    const guard = guards[index]; // 2.2 gets the guard reference.
                    const guardReturn = guard(route, state); // 2.3 executes the guard and get its return value.

                    // 3. Check if `guardReturn` value is `false`, an UrlTree, Observable or Promise
                    // If `guardReturn` value is `true` the loop will go on until it eventually finishes.
                    if (!guardReturn || guardReturn instanceof UrlTree) {
                        // 3.1 Checks if `guardReturn` value is either `false` or an UrlTree, if so resolves
                        // the Promise will resolve to this value right away.
                        resolve(guardReturn);
                        // As in the beginning of this helper function, it doesn't make much difference but
                        // it's better to have this return bellow.
                        return;
                    } else if (guardReturn instanceof Observable) {
                        // 3.2 Checks if `guardReturn` value is an Observable, if so, the `take(1)` pipe
                        // will be applied to make sure this observable completes after emiting 1 value and
                        // right after it will be converted to a Promise that resolve to the same value the
                        // Observable would've emitted at first. As soon as this Promise resolves will handle
                        // the response via the `handleAsyncRes()` helper function, `index` is passed as
                        // argument in case there is any need to keep parsing next guards in the `guards` array.
                        lastValueFrom(guardReturn.pipe(take(1)))
                        .then(handleAsyncRes(index));
                        // This return bellow is really important, as Promises run in the "backgound" the
                        // function would keep running before the Promise above could resolve to any value,
                        // and this way the loop would end and the main Promise would always resolve to `true`
                        // even if this should not be the case and the still non resolved promise above
                        // resolves to `false` or an UrlTree.
                        return;
                    } else if (guardReturn instanceof Promise) {
                        // 3.3 Checks if `guardReturn` value is an Promise, if so, the same actions taken in the
                        // condition above will be taken now.
                        guardReturn.then(handleAsyncRes(index));
                        return;
                    }
                }

                // 4. If the for loop has completed, this mean all the return values from all the guards in
                // the `guards` array were either `true` or a Promise or Observable that has resolved/emitted
                // `true`, so the Promise returned by this "wrapper" guard will also resolve to `true`
                resolve(true);
            }

            // This helper function returns another function that will parse the value resolved by a Promise
            // (or Observable converted to Promise) that was returned by a guard
            const handleAsyncRes = (currentIndex: number) => {
                return (res: Boolean | UrlTree) => {
                    if (!res || res instanceof UrlTree) {
                        // Checks if `res` (value resolved by the Promise) is `false` or an UrlTree, if so
                        // the Promise returned by this "wrapper" guard will also resolve to `true`
                        resolve(res);
                    } else {
                        // If `res` is `true`, the `parseGuardsStartingAt()` helper function will be executed
                        // to keep parsing the next guards in the `guards` array.
                        // Remember, if we're at the last guard, `currentIndex+1` will be equal to `guards`
                        // length, thus thethe Promise returned by this "wrapper" guard will resolve to `true`
                        // (within `parseGuardsStartingAt()`)
                        parseGuardsStartingAt(currentIndex+1);
                    }
                }
            }

            // 5. Trigger the execution of `parseGuardsStartingAt()` beginning at index 0.
            parseGuardsStartingAt(0);
        })
    }
}