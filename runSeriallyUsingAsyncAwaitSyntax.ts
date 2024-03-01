import { Injector, inject, runInInjectionContext } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, UrlTree } from '@angular/router';
import { Observable, lastValueFrom, take } from 'rxjs';

function runSeriallyWithPromises(...guards: CanActivateFn[] | CanActivateChildFn[]): CanActivateFn | CanActivateChildFn {
    return async (route, state) => {
        const injector = inject(Injector);

        for (let guard of guards) {
            let resultValue = runInInjectionContext(injector, () => guard(route, state));

            if (resultValue instanceof Observable) {
                resultValue = await lastValueFrom(resultValue.pipe(take(1)));
            } else if (resultValue instanceof Promise) {
                resultValue = await resultValue;
            }

            if (resultValue === false || resultValue instanceof UrlTree) {
                return resultValue;
            }   
        }

        return true;
    }
}
