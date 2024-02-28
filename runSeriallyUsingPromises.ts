function runSeriallyWithPromisesAny(...guards: CanActivateFn[] | CanActivateChildFn[]): CanActivateFn | CanActivateChildFn {

    return (route, state) => {
        return new Promise(resolve => {

            const evalGuardsStartingAt = (index: number) => {
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
                        evalGuardsStartingAt(currentIndex+1);
                    }
                }
            }

            evalGuardsStartingAt(0);
        })
    }
}
