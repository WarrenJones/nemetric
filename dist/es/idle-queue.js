"use strict";
/*
 * Copyright 2018 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @private
 * @return {number} The current date timestamp
 */
exports.now = function () {
    return +new Date();
};
/**
 * A minimal shim of the native IdleDeadline class.
 */
var IdleDealine = /** @class */ (function () {
    /** @param {number} initTime */
    function IdleDealine(initTime) {
        this.initTime_ = initTime;
    }
    Object.defineProperty(IdleDealine.prototype, "didTimeout", {
        get: function () {
            return false;
        },
        enumerable: true,
        configurable: true
    });
    IdleDealine.prototype.timeRemaining = function () {
        return Math.max(0, 50 - (exports.now() - this.initTime_));
    };
    return IdleDealine;
}());
/**
 * A minimal shim for the requestIdleCallback function. This accepts a
 * callback function and runs it at the next idle period, passing in an
 * object with a `timeRemaining()` method.
 * @private
 * @param {!Function} callback
 * @return {number}
 */
var requestIdleCallbackShim = function (callback) {
    var deadline = new IdleDealine(exports.now());
    return setTimeout(function () { return callback(deadline); }, 0);
};
/**
 * A minimal shim for the  cancelIdleCallback function. This accepts a
 * handle identifying the idle callback to cancel.
 * @private
 * @param {number|null} handle
 */
var cancelIdleCallbackShim = function (handle) {
    clearTimeout(handle);
};
var supportsPromisesNatively = typeof Promise === 'function' &&
    Promise.toString().indexOf('[native code]') > -1;
var supportsMutationObserver = 'MutationObserver' in window ||
    'WebKitMutationObserver' in window ||
    'MozMutationObserver' in window;
/*
 * Copyright 2018 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @return {!Function}
 */
var createQueueMicrotaskViaPromises = function () {
    return function (microtask) {
        Promise.resolve().then(microtask);
    };
};
/**
 * @return {!Function}
 */
var createQueueMicrotaskViaMutationObserver = function () {
    var i = 0;
    var microtaskQueue = [];
    var observer = new MutationObserver(function () {
        microtaskQueue.forEach(function (microtask) { return microtask(); });
        microtaskQueue = [];
    });
    var node = document.createTextNode('');
    observer.observe(node, { characterData: true });
    return function (microtask) {
        microtaskQueue.push(microtask);
        // Trigger a mutation observer callback, which is a microtask.
        // tslint:disable-next-line:no-increment-decrement
        node.data = String(++i % 2);
    };
};
var discardMicrotasks = function () {
    return function (microtask) { };
};
/**
 * Queues a function to be run in the next microtask. If the browser supports
 * Promises, those are used. Otherwise it falls back to MutationObserver.
 * Note: since Promise polyfills are popular but not all support microtasks,
 * we check for native implementation rather than a polyfill.
 * @private
 * @param {!Function} microtask
 */
exports.queueMicrotask = supportsPromisesNatively
    ? createQueueMicrotaskViaPromises()
    : supportsMutationObserver
        ? createQueueMicrotaskViaMutationObserver()
        : discardMicrotasks();
var DEFAULT_MIN_TASK_TIME = 0;
var isSafari_ = !!(typeof window.safari === 'object' && window.safari.pushNotification);
/**
 * A class wraps a queue of requestIdleCallback functions for two reasons:
 *   1. So other callers can know whether or not the queue is empty.
 *   2. So we can provide some guarantees that the queued functions will
 *      run in unload-type situations.
 */
var IdleQueue = /** @class */ (function () {
    /**
     * Creates the IdleQueue instance and adds lifecycle event listeners to
     * run the queue if the page is hidden (with fallback behavior for Safari).
     * @param {{
     *   ensureTasksRun: boolean,
     *   defaultMinTaskTime: number,
     * }=} param1
     */
    function IdleQueue(_a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.ensureTasksRun, ensureTasksRun = _c === void 0 ? false : _c, _d = _b.defaultMinTaskTime, defaultMinTaskTime = _d === void 0 ? DEFAULT_MIN_TASK_TIME : _d;
        this.taskQueue_ = [];
        this.isProcessing_ = false;
        this.state_ = null;
        this.idleCallbackHandle_ = null;
        this.taskQueue_ = [];
        this.isProcessing_ = false;
        this.state_ = null;
        this.defaultMinTaskTime_ = defaultMinTaskTime;
        this.ensureTasksRun_ = ensureTasksRun;
        // Bind methods
        this.runTasksImmediately = this.runTasksImmediately.bind(this);
        this.runTasks_ = this.runTasks_.bind(this);
        this.onVisibilityChange_ = this.onVisibilityChange_.bind(this);
        if (this.ensureTasksRun_) {
            addEventListener('visibilitychange', this.onVisibilityChange_, true);
            // Safari does not reliably fire the `pagehide` or `visibilitychange`
            // events when closing a tab, so we have to use `beforeunload` with a
            // timeout to check whether the default action was prevented.
            // - https://bugs.webkit.org/show_bug.cgi?id=151610
            // - https://bugs.webkit.org/show_bug.cgi?id=151234
            // NOTE: we only add this to Safari because adding it to Firefox would
            // prevent the page from being eligible for bfcache.
            if (isSafari_) {
                addEventListener('beforeunload', this.runTasksImmediately, true);
            }
        }
    }
    /**
     * @param {...*} args
     */
    IdleQueue.prototype.pushTask = function (cb) {
        this.addTask_(Array.prototype.push, cb);
    };
    /**
     * @param {...*} args
     */
    IdleQueue.prototype.unshiftTask = function (cb) {
        this.addTask_(Array.prototype.unshift, cb);
    };
    /**
     * Runs all scheduled tasks synchronously.
     */
    IdleQueue.prototype.runTasksImmediately = function () {
        // By not passing a deadline, all tasks will be run sync.
        this.runTasks_();
    };
    /**
     * @return {boolean}
     */
    IdleQueue.prototype.hasPendingTasks = function () {
        return this.taskQueue_.length > 0;
    };
    /**
     * Clears all pending tasks for the queue and stops any scheduled tasks
     * from running.
     */
    IdleQueue.prototype.clearPendingTasks = function () {
        this.taskQueue_ = [];
        this.cancelScheduledRun_();
    };
    /**
     * Returns the state object for the currently running task. If no task is
     * running, null is returned.
     * @return {?Object}
     */
    IdleQueue.prototype.getState = function () {
        return this.state_;
    };
    /**
     * Destroys the instance by unregistering all added event listeners and
     * removing any overridden methods.
     */
    IdleQueue.prototype.destroy = function () {
        this.taskQueue_ = [];
        this.cancelScheduledRun_();
        if (this.ensureTasksRun_) {
            removeEventListener('visibilitychange', this.onVisibilityChange_, true);
            // Safari does not reliably fire the `pagehide` or `visibilitychange`
            // events when closing a tab, so we have to use `beforeunload` with a
            // timeout to check whether the default action was prevented.
            // - https://bugs.webkit.org/show_bug.cgi?id=151610
            // - https://bugs.webkit.org/show_bug.cgi?id=151234
            // NOTE: we only add this to Safari because adding it to Firefox would
            // prevent the page from being eligible for bfcache.
            if (isSafari_) {
                removeEventListener('beforeunload', this.runTasksImmediately, true);
            }
        }
    };
    /**
     * @param {!Function} arrayMethod Either the Array.prototype{push|shift}.
     * @param {!Function} task
     * @param {{minTaskTime: number}=} param1
     * @private
     */
    IdleQueue.prototype.addTask_ = function (arrayMethod, task, _a) {
        var _b = (_a === void 0 ? {} : _a).minTaskTime, minTaskTime = _b === void 0 ? this.defaultMinTaskTime_ : _b;
        var state = {
            time: exports.now(),
            visibilityState: document.visibilityState,
        };
        arrayMethod.call(this.taskQueue_, { state: state, task: task, minTaskTime: minTaskTime });
        this.scheduleTasksToRun_();
    };
    /**
     * Schedules the task queue to be processed. If the document is in the
     * hidden state, they queue is scheduled as a microtask so it can be run
     * in cases where a macrotask couldn't (like if the page is unloading). If
     * the document is in the visible state, `requestIdleCallback` is used.
     * @private
     */
    IdleQueue.prototype.scheduleTasksToRun_ = function () {
        if (this.ensureTasksRun_ && document.visibilityState === 'hidden') {
            exports.queueMicrotask(this.runTasks_);
        }
        else {
            if (!this.idleCallbackHandle_) {
                this.idleCallbackHandle_ = requestIdleCallbackShim(this.runTasks_);
            }
        }
    };
    /**
     * Runs as many tasks in the queue as it can before reaching the
     * deadline. If no deadline is passed, it will run all tasks.
     * If an `IdleDeadline` object is passed (as is with `requestIdleCallback`)
     * then the tasks are run until there's no time remaining, at which point
     * we yield to input or other script and wait until the next idle time.
     * @param {IdleDeadline=} deadline
     * @private
     */
    IdleQueue.prototype.runTasks_ = function (deadline) {
        this.cancelScheduledRun_();
        if (!this.isProcessing_) {
            this.isProcessing_ = true;
            // Process tasks until there's no time left or we need to yield to input.
            while (this.hasPendingTasks() &&
                !shouldYield(deadline, this.taskQueue_[0].minTaskTime)) {
                var _a = this.taskQueue_.shift(), task = _a.task, state = _a.state;
                this.state_ = state;
                task(state);
                this.state_ = null;
            }
            this.isProcessing_ = false;
            if (this.hasPendingTasks()) {
                // Schedule the rest of the tasks for the next idle time.
                this.scheduleTasksToRun_();
            }
        }
    };
    /**
     * Cancels any scheduled idle callback and removes the handler (if set).
     * @private
     */
    IdleQueue.prototype.cancelScheduledRun_ = function () {
        cancelIdleCallbackShim(this.idleCallbackHandle_);
        this.idleCallbackHandle_ = null;
    };
    /**
     * A callback for the `visibilitychange` event that runs all pending
     * callbacks immediately if the document's visibility state is hidden.
     * @private
     */
    IdleQueue.prototype.onVisibilityChange_ = function () {
        if (document.visibilityState === 'hidden') {
            this.runTasksImmediately();
        }
    };
    return IdleQueue;
}());
exports.IdleQueue = IdleQueue;
/**
 * Returns true if the IdleDealine object exists and the remaining time is
 * less or equal to than the minTaskTime. Otherwise returns false.
 * @param {IdleDeadline|undefined} deadline
 * @param {number} minTaskTime
 * @return {boolean}
 * @private
 */
var shouldYield = function (deadline, minTaskTime) {
    if (deadline && deadline.timeRemaining() <= minTaskTime) {
        return true;
    }
    return false;
};
//# sourceMappingURL=idle-queue.js.map