import { Injector, inject, runInInjectionContext } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, UrlTree } from '@angular/router';
import { Observable, concatMap, from, last, of, take, takeWhile } from 'rxjs';

function runSerially(...guards: CanActivateFn[] | CanActivateChildFn[]): CanActivateFn | CanActivateChildFn {
    return (route, state) => {
        const injector = inject(Injector);

        return from(guards).pipe(
            concatMap(guard => {
                const resultValue = runInInjectionContext(injector, () => guard(route, state));

                if (resultValue instanceof Observable) {
                    return resultValue.pipe(take(1));
                } else if (resultValue instanceof Promise) {
                    return resultValue;
                }

                return of(resultValue);
            }),
            takeWhile(value => {
                if (value instanceof UrlTree) {
                    return false;
                }

                return value;
            }, true),
            last()
        )
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
function _runSerially(...guards: CanActivateFn[] | CanActivateChildFn[]): CanActivateFn | CanActivateChildFn {

    // returns a "wrapper" guard that embeds all guards passed as arguments
    return (route, state) => {
        const injector = inject(Injector);

        // this "wrapper" guard will return a "fancy" Observable to which Angular will subscribe
        // 1. Creates an Observable out of all guards
        return from(guards).pipe(
            // 2. Standardize all values that'd be emitted by the previous Observable into a
            // single flat/fist-order Observable that emits only Booleans or UrlTrees.
            // This `concatMap()` op is what makes it all run synchronously as the resulting
            // Observable will only emit values from the "next" Observable after all values from
            // the previous one have been emitted (no matter how long it takes to complete).
            concatMap(guard => {
                // 2.1. Run each guard and store it's return value:
                // boolean | UrlTree | Observable< boolean | UrlTree > | Promise< boolean | UrlTree >
                const resultValue = runInInjectionContext(injector, () => guard(route, state));

                // 2.2. Evaluates the return value and converts it to an Observable if needed so that
                // the `concatMap` operator can do its job and in the end concatenate the emitted value
                // from all this Observables into a single Observable whose emitted values are either
                // a Boolean or UrlTree

                // All Observables returned by `concatMap()` must complete, otherwise the value from
                // the next Observable will never be emitted.
                if (resultValue instanceof Observable) {
                    // `take(1)` op is to make sure the returned Observable completes.
                    return resultValue.pipe(take(1));
                } else if (resultValue instanceof Promise) {
                    // Promises are "like" Observables that complete after emiting a single value
                    // the value the promise resolves in this case.
                    return resultValue;
                }

                // resultValue is either a Boolean or UrlTree, thus we just turn it into an Observable
                return of(resultValue); // Create an Observable that completes after emiting `resultValue`
            }),
            // 3. Checks if any `false` or UrlTree value was emitted, if so returns an Observable that
            // will emit all values that'd been emitted until this `false` or UrlTree value (also includes
            // this last `false` or UrlTree value), otherwise will return an Observable that will only
            // ever emit `true`
            takeWhile(value => {
                if (value instanceof UrlTree) {
                    // 3.1. As soon as bumps into an Urltree, stops taking values
                    return false;
                }

                // 3.2. As soon as value is `false` will stop taking values, if it's `true` will just continue
                return value;
            }, true),
            // 4. Create a final Observable that will emit only the last value that'd be returned by the
            // last Observable, i.e. the first value that failed the condition in `takeWhile()`, `false`
            // or UrlTree in this case, or `true` if no guard has failed.
            last()
        )
    }
}
