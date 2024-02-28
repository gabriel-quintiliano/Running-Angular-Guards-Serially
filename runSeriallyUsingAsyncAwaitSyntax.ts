function runSeriallyWithPromises(...guards: CanActivateFn[] | CanActivateChildFn[]): CanActivateFn | CanActivateChildFn {
    return async (route, state) => {
        for (let guard of guards) {
            let resultValue = guard(route, state);

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
