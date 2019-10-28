/**
 * @private
 * @return {number} The current date timestamp
 */
export declare const now: () => number;
declare global {
    interface Window {
        cancelIdleCallback: any;
        requestIdleCallback: any;
        safari: any;
    }
}
/**
 * Queues a function to be run in the next microtask. If the browser supports
 * Promises, those are used. Otherwise it falls back to MutationObserver.
 * Note: since Promise polyfills are popular but not all support microtasks,
 * we check for native implementation rather than a polyfill.
 * @private
 * @param {!Function} microtask
 */
export declare const queueMicrotask: (microtask: any) => void;
/**
 * A class wraps a queue of requestIdleCallback functions for two reasons:
 *   1. So other callers can know whether or not the queue is empty.
 *   2. So we can provide some guarantees that the queued functions will
 *      run in unload-type situations.
 */
export declare class IdleQueue {
    idleCallbackHandle_: any;
    taskQueue_: never[];
    isProcessing_: boolean;
    state_: null;
    defaultMinTaskTime_: any;
    ensureTasksRun_: any;
    /**
     * Creates the IdleQueue instance and adds lifecycle event listeners to
     * run the queue if the page is hidden (with fallback behavior for Safari).
     * @param {{
     *   ensureTasksRun: boolean,
     *   defaultMinTaskTime: number,
     * }=} param1
     */
    constructor({ ensureTasksRun, defaultMinTaskTime, }?: {
        ensureTasksRun?: boolean | undefined;
        defaultMinTaskTime?: number | undefined;
    });
    /**
     * @param {...*} args
     */
    pushTask(cb: any): void;
    /**
     * @param {...*} args
     */
    unshiftTask(cb: any): void;
    /**
     * Runs all scheduled tasks synchronously.
     */
    runTasksImmediately(): void;
    /**
     * @return {boolean}
     */
    hasPendingTasks(): boolean;
    /**
     * Clears all pending tasks for the queue and stops any scheduled tasks
     * from running.
     */
    clearPendingTasks(): void;
    /**
     * Returns the state object for the currently running task. If no task is
     * running, null is returned.
     * @return {?Object}
     */
    getState(): null;
    /**
     * Destroys the instance by unregistering all added event listeners and
     * removing any overridden methods.
     */
    destroy(): void;
    /**
     * @param {!Function} arrayMethod Either the Array.prototype{push|shift}.
     * @param {!Function} task
     * @param {{minTaskTime: number}=} param1
     * @private
     */
    addTask_(arrayMethod: any, task: any, { minTaskTime }?: {
        minTaskTime?: any;
    }): void;
    /**
     * Schedules the task queue to be processed. If the document is in the
     * hidden state, they queue is scheduled as a microtask so it can be run
     * in cases where a macrotask couldn't (like if the page is unloading). If
     * the document is in the visible state, `requestIdleCallback` is used.
     * @private
     */
    scheduleTasksToRun_(): void;
    /**
     * Runs as many tasks in the queue as it can before reaching the
     * deadline. If no deadline is passed, it will run all tasks.
     * If an `IdleDeadline` object is passed (as is with `requestIdleCallback`)
     * then the tasks are run until there's no time remaining, at which point
     * we yield to input or other script and wait until the next idle time.
     * @param {IdleDeadline=} deadline
     * @private
     */
    runTasks_(deadline?: any): void;
    /**
     * Cancels any scheduled idle callback and removes the handler (if set).
     * @private
     */
    cancelScheduledRun_(): void;
    /**
     * A callback for the `visibilitychange` event that runs all pending
     * callbacks immediately if the document's visibility state is hidden.
     * @private
     */
    onVisibilityChange_(): void;
}
