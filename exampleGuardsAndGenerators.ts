import { CanActivateFn, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';

export const syncTrueGuard: CanActivateFn = (route, state) => {
    console.log("Sync guard that returns `true`")
    return true;
};

export const syncFalseGuard: CanActivateFn = (route, state) => {
    console.log("Sync guard that returns `false`")
    return false;
};


export const syncGuardBuilder: CanActivateFnBuilder = (wait, returnValue) => {
    return (route, state) => {
        return new Observable(sub => {
            console.log(`Observable that returns ${returnValue} in ${wait} ms`)
            setTimeout(() => {
                sub.next(returnValue);
            }, wait);
        })
    };
}

export const obsGuardBuilder: CanActivateFnBuilder = (wait, returnValue) => {
    return (route, state) => {
        return new Observable(sub => {
            console.log(`Observable that returns ${returnValue} in ${wait} ms`)
            setTimeout(() => {
                sub.next(returnValue);
            }, wait);
        })
    };
}

export const promGuardBuilder: CanActivateFnBuilder = (wait, returnValue) => {
    return (route, state) => {
        return new Promise((resolve, reject) => {
            console.log(`Promise that returns ${returnValue} in ${wait} ms`)
            setTimeout(() => {
                resolve(returnValue);
            }, wait);
        });
    };
}


type CanActivateFnBuilder = (wait: number, returnValue: boolean | UrlTree ) => CanActivateFn